<?php
/**
 * Friends links system: health check, RSS fetch, enriched data, meta boxes, and REST API routes
 *
 * @package Mango
 */

/**
 * 检查单个友链的健康状态
 */
function mango_check_link_health( string $url ): array {
	$result = [
		'status'        => 'unknown',
		'response_time' => 0,
		'last_checked'  => current_time( 'mysql' ),
	];

	// 多 User-Agent 轮换，避免被拦截
	$user_agents = [
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
		'Mozilla/5.0 (compatible; MangoBot/1.0; +https://mangotheme.dev)',
	];

	$base_args = [
		'timeout'     => 10,
		'redirection' => 5,
		'blocking'    => true,
		'headers'     => [ 'User-Agent' => $user_agents[ array_rand( $user_agents ) ] ],
	];

	// 请求策略：逐步降级
	$strategies = [
		// 策略1: HEAD + SSL 验证
		[ 'type' => 'HEAD', 'args' => $base_args ],
		// 策略2: GET + SSL 验证
		[ 'type' => 'GET', 'args' => array_merge( $base_args, [ 'timeout' => 15 ] ) ],
		// 策略3: GET + 跳过 SSL 验证（处理自签证书等）
		[ 'type' => 'GET', 'args' => array_merge( $base_args, [ 'timeout' => 15, 'sslverify' => false ] ) ],
	];

	$last_error = '';

	foreach ( $strategies as $strategy ) {
		$start = microtime( true );

		if ( $strategy['type'] === 'HEAD' ) {
			$response = wp_remote_head( $url, $strategy['args'] );
		} else {
			$response = wp_remote_get( $url, $strategy['args'] );
		}

		$elapsed = microtime( true ) - $start;

		$code = wp_remote_retrieve_response_code( $response );

		if ( is_wp_error( $response ) ) {
			$last_error = $response->get_error_message();
			continue; // 尝试下一策略
		}

		// 获取成功：更新时间并判断状态
		$result['response_time'] = round( $elapsed, 3 );

		if ( $code >= 200 && $code < 400 ) {
			$result['status'] = 'alive';
			return $result;
		}

		// 4xx/5xx 继续尝试下一策略
		$last_error = "HTTP {$code}";
	}

	// 所有策略都失败
	$result['status'] = 'dead';
	return $result;
}

/**
 * 获取单个友链的 RSS 订阅文章
 */
function mango_fetch_link_posts( string $feed_url ): array {
	if ( empty( $feed_url ) ) {
		return [];
	}

	$body = null;

	// 方法1: WordPress HTTP API
	$args = [
		'timeout'     => 15,
		'redirection' => 3,
		'headers'     => [ 'User-Agent' => 'Mozilla/5.0 (compatible; MangoBot/1.0; Feed Fetcher)' ],
		'sslverify'   => true,
	];

	$response = wp_remote_get( $feed_url, $args );
	if ( ! is_wp_error( $response ) ) {
		$code = wp_remote_retrieve_response_code( $response );
		if ( $code >= 200 && $code < 400 ) {
			$body = wp_remote_retrieve_body( $response );
		}
	}

	// 方法2: WordPress HTTP API 跳过 SSL 验证
	if ( empty( $body ) ) {
		$args['sslverify'] = false;
		$response          = wp_remote_get( $feed_url, $args );
		if ( ! is_wp_error( $response ) ) {
			$code = wp_remote_retrieve_response_code( $response );
			if ( $code >= 200 && $code < 400 ) {
				$body = wp_remote_retrieve_body( $response );
			}
		}
	}

	// 方法3: file_get_contents 兜底
	if ( empty( $body ) && ini_get( 'allow_url_fopen' ) ) {
		$ctx = stream_context_create( [
			'http' => [
				'timeout'         => 10,
				'user_agent'      => 'Mozilla/5.0 (compatible; MangoBot/1.0; Feed Fetcher)',
				'follow_location' => 3,
			],
			'ssl'  => [
				'verify_peer'      => false,
				'verify_peer_name' => false,
			],
		] );
		$fetched = @file_get_contents( $feed_url, false, $ctx );
		if ( $fetched !== false ) {
			$body = $fetched;
		}
	}

	if ( empty( $body ) ) {
		return [];
	}

	// 清理 BOM 和非法字符
	$body = preg_replace( '/^\xEF\xBB\xBF/', '', $body ); // UTF-8 BOM

	libxml_use_internal_errors( true );

	// 尝试1: 剥离默认命名空间再解析（兼容性最好）
	$stripped = preg_replace( '/(<\w+)\s+xmlns\s*=\s*["\'][^"\']*["\'](\s*)/', '$1$2', $body, 1 );
	$xml      = simplexml_load_string( $stripped );

	// 尝试2: 原始 XML + XPath
	if ( ! $xml ) {
		$xml = simplexml_load_string( $body );
	}

	// 尝试3: 只看是否是 Atom 格式，用字符串解析
	if ( ! $xml && str_contains( $body, '<feed' ) && str_contains( $body, '<entry' ) ) {
		// 直接正则提取
		$posts            = [];
		$entry_pattern    = '/<entry>.*?<\/entry>/s';
		preg_match_all( $entry_pattern, $body, $entries );

		if ( ! empty( $entries[0] ) ) {
			foreach ( $entries[0] as $entry_xml ) {
				$title = '';
				$link  = '';
				$pub   = '';

				if ( preg_match( '/<title[^>]*>(.*?)<\/title>/s', $entry_xml, $m ) ) {
					$title = trim( html_entity_decode( strip_tags( $m[1] ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
				}
				if ( preg_match( '/<link[^>]*href\s*=\s*"([^"]+)"/', $entry_xml, $m ) ) {
					$link = $m[1];
				}
				if ( preg_match( '/<published[^>]*>(.*?)<\/published>/s', $entry_xml, $m ) ) {
					$pub = trim( $m[1] );
				}
				if ( empty( $pub ) && preg_match( '/<updated[^>]*>(.*?)<\/updated>/s', $entry_xml, $m ) ) {
					$pub = trim( $m[1] );
				}

				if ( empty( $title ) || empty( $link ) ) {
					continue;
				}

				$posts[] = [
					'title'     => mb_substr( $title, 0, 120 ),
					'link'      => $link,
					'published' => $pub ? date_i18n( 'Y-m-d', strtotime( $pub ) ) : '',
				];

				if ( count( $posts ) >= 5 ) {
					break;
				}
			}
		}
		return $posts;
	}

	if ( ! $xml ) {
		return [];
	}

	$posts = [];

	// RSS 2.0
	if ( isset( $xml->channel->item ) ) {
		// dc 命名空间
		$dc = $xml->channel->children( 'http://purl.org/dc/elements/1.1/' );
		foreach ( $xml->channel->item as $item ) {
			$title = trim( (string) $item->title );
			$link  = trim( (string) $item->link );
			$pub   = trim( (string) $item->pubDate ?? '' );
			if ( empty( $pub ) && isset( $dc->date ) ) {
				$pub = trim( (string) $dc->date );
			}

			if ( empty( $title ) || empty( $link ) ) {
				continue;
			}

			$posts[] = [
				'title'     => mb_substr( $title, 0, 120 ),
				'link'      => $link,
				'published' => $pub ? date_i18n( 'Y-m-d', strtotime( $pub ) ) : '',
			];

			if ( count( $posts ) >= 5 ) {
				break;
			}
		}
	}

	// Atom — 命名空间已剥离或原始 XPath
	if ( empty( $posts ) ) {
		// 先尝试直接访问 entry（命名空间已剥离的 XML）
		$entries = null;
		if ( isset( $xml->entry ) ) {
			$entries = $xml->entry;
		}

		// 再尝试 XPath（带命名空间的原始 XML）
		if ( ! $entries ) {
			$atom_ns = 'http://www.w3.org/2005/Atom';
			@$xml->registerXPathNamespace( 'atom', $atom_ns );
			$xpath_result = $xml->xpath( '//atom:entry' );
			if ( $xpath_result && count( $xpath_result ) > 0 ) {
				$entries = $xpath_result;
			}
		}

		if ( $entries ) {
			foreach ( $entries as $entry ) {
				$title = trim( (string) $entry->title );
				$link  = '';
				foreach ( $entry->link as $l ) {
					$attrs = $l->attributes();
					$rel   = (string) ( $attrs['rel'] ?? '' );
					if ( $rel === 'alternate' || $rel === '' ) {
						$link = (string) ( $attrs['href'] ?? '' );
						break;
					}
				}
				$pub = trim( (string) $entry->published ?? (string) $entry->updated ?? '' );

				if ( empty( $title ) || empty( $link ) ) {
					continue;
				}

				$posts[] = [
					'title'     => mb_substr( $title, 0, 120 ),
					'link'      => $link,
					'published' => $pub ? date_i18n( 'Y-m-d', strtotime( $pub ) ) : '',
				];

				if ( count( $posts ) >= 5 ) {
					break;
				}
			}
		}
	}

	return $posts;
}

/**
 * 获取所有友链的完整数据（含健康状态标签和订阅文章）
 * 数据格式对齐 Stellar friends_and_posts
 */
function mango_get_enriched_links(): array {
	$bookmarks = get_bookmarks( [
		'orderby'        => 'rating',
		'order'          => 'DESC',
		'hide_invisible' => 1,
		'show_updated'   => 0,
	] );

	$links = [];
	foreach ( $bookmarks as $bm ) {
		$link_id  = $bm->link_id;
		$feed_url = trim( $bm->link_rss ?? '' );
		$url      = $bm->link_url;

		// 单条健康检查缓存
		$health_key = 'mango_link_health_' . $link_id;
		$health     = get_transient( $health_key );

		if ( $health === false ) {
			$health = mango_check_link_health( $url );
			set_transient( $health_key, $health, 6 * HOUR_IN_SECONDS );
		}

		// 单条文章缓存
		$post_key = 'mango_link_posts_' . $link_id;
		$posts    = get_transient( $post_key );

		if ( $posts === false && ! empty( $feed_url ) ) {
			$posts = mango_fetch_link_posts( $feed_url );
			// RSS 解析失败时降级到手动设置的代表文章
			if ( empty( $posts ) ) {
				$manual = get_option( 'mango_link_articles_' . $link_id, [] );
				if ( ! empty( $manual ) ) {
					$posts = $manual;
				}
			}
			set_transient( $post_key, $posts, HOUR_IN_SECONDS );
		} elseif ( empty( $feed_url ) ) {
			// 无 RSS 时使用手动设置的「代表文章」
			$manual = get_option( 'mango_link_articles_' . $link_id, [] );
			$posts  = is_array( $manual ) ? $manual : [];
		}

		// 生成 Stellar 格式的 labels
		$labels = [];

		// 健康状态标签
		$health_colors = [
			'alive'   => [ 'name' => '在线', 'color' => '4ade80' ],
			'dead'    => [ 'name' => '失联', 'color' => 'ff6b6b' ],
			'unknown' => [ 'name' => '未知', 'color' => 'a0a8c0' ],
		];

		$status = $health['status'] ?? 'unknown';
		if ( isset( $health_colors[ $status ] ) ) {
			$hc            = $health_colors[ $status ];
			$hsl           = mango_hex_to_hsl( $hc['color'] );
			$labels[]      = [
				'name'       => $hc['name'],
				'color'      => $hc['color'],
				'lightness'  => $hsl['lightness'],
				'saturation' => $hsl['saturation'],
				'hue'        => $hsl['hue'],
			];
		}

		// 响应时间标签（仅在线时）
		if ( $status === 'alive' && $health['response_time'] > 0 ) {
			$rt_ms    = round( $health['response_time'] * 1000 );
			$rt_color = $rt_ms < 500 ? '4ade80' : ( $rt_ms < 1500 ? 'fbbf24' : 'fb923c' );
			$hsl      = mango_hex_to_hsl( $rt_color );
			$labels[] = [
				'name'       => $rt_ms < 1000 ? $rt_ms . 'ms' : round( $health['response_time'], 2 ) . 's',
				'color'      => $rt_color,
				'lightness'  => $hsl['lightness'],
				'saturation' => $hsl['saturation'],
				'hue'        => $hsl['hue'],
			];
		}

		$links[] = [
			'id'          => $link_id,
			'title'       => $bm->link_name,
			'url'         => $url,
			'html_url'    => $url,
			'avatar'      => $bm->link_image,
			'avatar_url'  => $bm->link_image,
			'description' => $bm->link_description,
			'feed'        => $feed_url ?: '',
			'labels'      => $labels,
			'posts'       => $posts,
		];
	}

	// 排序：有 RSS 有文章 > 有 RSS 无文章 > 无 RSS；同组按最新文章日期降序
	usort( $links, function ( array $a, array $b ): int {
		$a_has_rss   = ! empty( $a['feed'] );
		$b_has_rss   = ! empty( $b['feed'] );
		$a_has_posts = ! empty( $a['posts'] );
		$b_has_posts = ! empty( $b['posts'] );

		// 分组优先级：有文章（RSS 或手动）=0，有 RSS 无文章=1，无 RSS 无文章=2
		$a_group = $a_has_posts ? 0 : ( $a_has_rss ? 1 : 2 );
		$b_group = $b_has_posts ? 0 : ( $b_has_rss ? 1 : 2 );

		if ( $a_group !== $b_group ) {
			return $a_group <=> $b_group;
		}

		// 同组：按最新文章日期降序
		$a_date = $a_has_posts ? ( $a['posts'][0]['published'] ?? '' ) : '';
		$b_date = $b_has_posts ? ( $b['posts'][0]['published'] ?? '' ) : '';

		if ( $a_date !== $b_date ) {
			return strcmp( $b_date, $a_date ); // 降序（最新的在前）
		}

		return 0;
	} );

	return $links;
}

/* ===== REST API Routes ===== */

/**
 * 注册自定义 REST API 路由 — 友链
 */
function mango_register_links_routes(): void {
	// GET /links — 获取所有友链（含健康状态和文章）
	register_rest_route( 'mango/v1', '/links', [
		'methods'             => 'GET',
		'callback'            => function (): WP_REST_Response {
			$links = mango_get_enriched_links();
			return new WP_REST_Response( $links, 200 );
		},
		'permission_callback' => '__return_true',
	] );

	// POST /links/refresh — 手动触发友链数据刷新（需管理员权限）
	register_rest_route( 'mango/v1', '/links/refresh', [
		'methods'             => 'POST',
		'callback'            => function (): WP_REST_Response {
			// 清除所有健康检查和文章缓存
			$bookmarks = get_bookmarks( [ 'hide_invisible' => 0 ] );
			foreach ( $bookmarks as $bm ) {
				delete_transient( 'mango_link_health_' . $bm->link_id );
				delete_transient( 'mango_link_posts_' . $bm->link_id );
			}
			$links = mango_get_enriched_links();
			return new WP_REST_Response( [
				'message' => __( '友链数据已刷新', 'mango' ),
				'links'   => $links,
			], 200 );
		},
		'permission_callback' => function (): bool {
			return current_user_can( 'manage_options' );
		},
	] );
}
add_action( 'rest_api_init', 'mango_register_links_routes' );

/**
 * 注册自定义 REST API — 获取导航菜单
 */
function mango_register_menu_routes(): void {
	register_rest_route( 'mango/v1', '/menu', [
		'methods'             => 'GET',
		'callback'            => function (): WP_REST_Response {
			$locations = get_nav_menu_locations();
			$menu_id   = $locations['primary'] ?? 0;

			if ( ! $menu_id ) {
				return new WP_REST_Response( [], 200 );
			}

			$items = wp_get_nav_menu_items( $menu_id );
			if ( ! $items || is_wp_error( $items ) ) {
				return new WP_REST_Response( [], 200 );
			}

			$site_url  = trailingslashit( site_url() );
			$menu_data = [];

			foreach ( $items as $item ) {
				$menu_data[] = [
					'id'     => $item->ID,
					'title'  => $item->title,
					'url'    => $item->url,
					'slug'   => basename( untrailingslashit( $item->url ) ),
					'parent' => (int) $item->menu_item_parent,
					'order'  => (int) $item->menu_order,
					'target' => $item->target ?: '',
				];
			}

			return new WP_REST_Response( $menu_data, 200 );
		},
		'permission_callback' => '__return_true',
	] );
}
add_action( 'rest_api_init', 'mango_register_menu_routes' );

/**
 * 注册自定义 REST API — 获取分类栏菜单
 */
function mango_register_category_menu_routes(): void {
	register_rest_route( 'mango/v1', '/category-menu', [
		'methods'             => 'GET',
		'callback'            => function (): WP_REST_Response {
			$locations = get_nav_menu_locations();
			$menu_id   = $locations['category_bar'] ?? 0;

			if ( ! $menu_id ) {
				return new WP_REST_Response( [], 200 );
			}

			$items = wp_get_nav_menu_items( $menu_id );
			if ( ! $items || is_wp_error( $items ) ) {
				return new WP_REST_Response( [], 200 );
			}

			$site_url  = trailingslashit( site_url() );
			$menu_data = [];

			foreach ( $items as $item ) {
				// 标准化路径：将 /archives/category/xxx 转为 /category/xxx
				$url_path    = parse_url( $item->url, PHP_URL_PATH ) ?? '';
				$normalized  = $url_path;
				if ( preg_match( '#/archives/category/(.+)$#', $url_path, $m ) || preg_match( '#/category/(.+)$#', $url_path, $m ) ) {
					$normalized = '/category/' . $m[1];
				}

				$menu_data[] = [
					'id'     => $item->ID,
					'title'  => $item->title,
					'url'    => $item->url,
					'path'   => $normalized,
					'slug'   => basename( untrailingslashit( $item->url ) ),
					'parent' => (int) $item->menu_item_parent,
					'order'  => (int) $item->menu_order,
					'target' => $item->target ?: '',
				];
			}

			return new WP_REST_Response( $menu_data, 200 );
		},
		'permission_callback' => '__return_true',
	] );
}
add_action( 'rest_api_init', 'mango_register_category_menu_routes' );

/* ===== Link Admin Meta Boxes ===== */

/**
 * 在友链编辑/添加页面添加提示信息
 */
function mango_link_manager_rss_help(): void {
	$screen = get_current_screen();
	if ( $screen && $screen->base === 'link' ) {
		echo '<p class="description" style="margin:8px 0 0;color:#646970;">';
		_e( '「RSS 地址」字段填写友链的 RSS/Atom 订阅链接，友链页面将自动显示该站点的最近文章。', 'mango' );
		echo '</p>';
	}
}
add_action( 'admin_footer', 'mango_link_manager_rss_help' );

/**
 * 添加「代表文章」元框到友链编辑页面
 * 用于没有 RSS 订阅的友链手动设置代表文章
 */
function mango_add_link_articles_meta_box(): void {
	add_meta_box(
		'mango_link_articles',
		__( '代表文章', 'mango' ),
		'mango_render_link_articles_meta_box',
		'link',
		'normal',
		'default'
	);
}
add_action( 'add_meta_boxes', 'mango_add_link_articles_meta_box' );

/**
 * 渲染代表文章元框
 */
function mango_render_link_articles_meta_box( object $post ): void {
	$link_id  = $post->link_id ?? $post->ID ?? 0;
	$articles = get_option( 'mango_link_articles_' . $link_id, [] );
	if ( ! is_array( $articles ) ) {
		$articles = [];
	}
	wp_nonce_field( 'mango_link_articles_save', 'mango_link_articles_nonce' );
	?>
	<div id="mango-articles-repeater">
		<p class="description"><?php _e( '为没有 RSS 的友链手动设置代表文章（最多 5 篇），填写文章标题、链接和发布时间。', 'mango' ); ?></p>
		<table class="widefat striped" style="margin-top:10px;">
			<thead>
				<tr>
					<th style="width:5%;">#</th>
					<th style="width:35%;"><?php _e( '文章标题', 'mango' ); ?></th>
					<th style="width:35%;"><?php _e( '文章链接', 'mango' ); ?></th>
					<th style="width:15%;"><?php _e( '发布时间', 'mango' ); ?></th>
					<th style="width:10%;"><?php _e( '操作', 'mango' ); ?></th>
				</tr>
			</thead>
			<tbody id="mango-articles-tbody">
				<?php foreach ( $articles as $i => $a ): ?>
				<tr>
					<td><?php echo $i + 1; ?></td>
					<td><input type="text" name="mango_article_title[<?php echo $i; ?>]" value="<?php echo esc_attr( $a['title'] ?? '' ); ?>" class="widefat" /></td>
					<td><input type="url" name="mango_article_link[<?php echo $i; ?>]" value="<?php echo esc_attr( $a['link'] ?? '' ); ?>" class="widefat" placeholder="https://" /></td>
					<td><input type="date" name="mango_article_published[<?php echo $i; ?>]" value="<?php echo esc_attr( $a['published'] ?? '' ); ?>" class="widefat" /></td>
					<td><button type="button" class="button mango-remove-article"><?php _e( '删除', 'mango' ); ?></button></td>
				</tr>
				<?php endforeach; ?>
			</tbody>
		</table>
		<input type="hidden" id="mango-articles-count" name="mango_articles_count" value="<?php echo count( $articles ); ?>" />
		<button type="button" class="button" id="mango-add-article" style="margin-top:8px;">+ <?php _e( '添加文章', 'mango' ); ?></button>
	</div>
	<script>
	jQuery(function($) {
		var idx = $('#mango-articles-count').val();
		$('#mango-add-article').on('click', function() {
			if (idx >= 5) { alert('最多 5 篇'); return; }
			var row = '<tr><td>' + (parseInt(idx) + 1) + '</td>' +
				'<td><input type="text" name="mango_article_title[' + idx + ']" value="" class="widefat" /></td>' +
				'<td><input type="url" name="mango_article_link[' + idx + ']" value="" class="widefat" placeholder="https://" /></td>' +
				'<td><input type="date" name="mango_article_published[' + idx + ']" value="" class="widefat" /></td>' +
				'<td><button type="button" class="button mango-remove-article">删除</button></td></tr>';
			$('#mango-articles-tbody').append(row);
			$('#mango-articles-count').val(++idx);
		});
		$('#mango-articles-repeater').on('click', '.mango-remove-article', function() {
			$(this).closest('tr').remove();
		});
	});
	</script>
	<style>
	#mango-articles-tbody input { margin: 2px 0; }
	</style>
	<?php
}

/**
 * 保存代表文章数据
 */
function mango_save_link_articles( int $link_id ): void {
	if ( ! isset( $_POST['mango_link_articles_nonce'] ) || ! wp_verify_nonce( $_POST['mango_link_articles_nonce'], 'mango_link_articles_save' ) ) {
		return;
	}
	if ( ! current_user_can( 'manage_links' ) ) {
		return;
	}

	$count    = intval( $_POST['mango_articles_count'] ?? 0 );
	$articles = [];

	for ( $i = 0; $i < $count; $i++ ) {
		$title = sanitize_text_field( $_POST['mango_article_title'][ $i ] ?? '' );
		$link  = esc_url_raw( $_POST['mango_article_link'][ $i ] ?? '' );
		$pub   = sanitize_text_field( $_POST['mango_article_published'][ $i ] ?? '' );
		if ( ! empty( $title ) && ! empty( $link ) ) {
			$articles[] = [
				'title'     => $title,
				'link'      => $link,
				'published' => $pub,
			];
		}
	}

	if ( ! empty( $articles ) ) {
		update_option( 'mango_link_articles_' . $link_id, $articles, false );
	} else {
		delete_option( 'mango_link_articles_' . $link_id );
	}
}
add_action( 'edit_link', 'mango_save_link_articles' );