<?php
/**
 * Theme setup, enqueue scripts, and WordPress head cleanup
 *
 * @package Mango
 */

/**
 * Enqueue scripts and styles for the React SPA.
 */
function mango_enqueue_scripts(): void {
	$theme   = wp_get_theme( 'mango' );
	$version = $theme->get( 'Version' );

	// 获取构建清单文件中的入口资源
	$build_dir     = get_template_directory() . '/';
	$manifest_path = $build_dir . 'manifest.json';

	if ( file_exists( $manifest_path ) ) {
		$manifest = json_decode( file_get_contents( $manifest_path ), true );

		// 查找 JS 入口文件
		foreach ( $manifest as $key => $item ) {
			if ( isset( $item['isEntry'] ) && $item['isEntry'] ) {
				// Enqueue CSS
				if ( ! empty( $item['css'] ) ) {
					foreach ( $item['css'] as $css_file ) {
						wp_enqueue_style(
							'mango-' . sanitize_title( basename( $css_file, '.css' ) ),
							get_template_directory_uri() . '/' . $css_file,
							[],
							$version
						);
					}
				}

				// Enqueue JS
				wp_enqueue_script(
					'mango-app',
					get_template_directory_uri() . '/' . $item['file'],
					[],
					$version,
					true
				);

				break;
			}
		}
	}

	// 读取基本设置
	$mango_basic = get_option( 'mango_basic_settings', [] );

	// 读取社交链接
	$mango_social = get_option( 'mango_social_links', [] );

	// 读取文章显示设置
	$mango_post_display = get_theme_mod( 'mango_post_display_settings', [] );

	// 读取布局设置
	$mango_layout = get_theme_mod( 'mango_layout_settings', [] );

	// 读取 Live2D 看板娘设置
	$mango_live2d = get_theme_mod( 'mango_live2d_settings', [] );

	// 读取侧边栏配置
	$mango_sidebar_widgets = get_option( 'mango_sidebar_widgets', [] );
	if ( empty( $mango_sidebar_widgets ) ) {
		$mango_sidebar_widgets = [
			[ 'id' => 'w_profile', 'side' => 'left', 'type' => 'profile', 'title' => '', 'content' => '', 'order' => 1, 'display_on' => [] ],
			[ 'id' => 'w_categories', 'side' => 'left', 'type' => 'categories', 'title' => '', 'content' => '', 'order' => 2, 'display_on' => [] ],
			[ 'id' => 'w_topics', 'side' => 'left', 'type' => 'topics', 'title' => '', 'content' => '', 'order' => 3, 'display_on' => [] ],
			[ 'id' => 'w_about', 'side' => 'left', 'type' => 'about', 'title' => '', 'content' => 'Mango 是一个基于 WordPress + React 的个人博客主题，追求极致的视觉体验与性能。', 'order' => 4, 'display_on' => [] ],
			[ 'id' => 'w_tags', 'side' => 'right', 'type' => 'tags', 'title' => '', 'content' => '', 'order' => 1, 'display_on' => [] ],
			[ 'id' => 'w_site_info', 'side' => 'right', 'type' => 'site_info', 'title' => '', 'content' => '', 'order' => 2, 'display_on' => [] ],
		];
	}

	// 站点统计（总字数、最后活动使用 transient 缓存，24 小时过期）
	$stats_cache = get_transient( 'mango_site_stats' );
	if ( false === $stats_cache ) {
		global $wpdb;
		$last_activity = $wpdb->get_var( "SELECT post_modified FROM {$wpdb->posts} WHERE post_type='post' AND post_status='publish' ORDER BY post_modified DESC LIMIT 1" );
		$total_words   = 0;
		$contents      = $wpdb->get_col( "SELECT post_content FROM {$wpdb->posts} WHERE post_type='post' AND post_status='publish'" );
		foreach ( $contents as $content ) {
			$total_words += mb_strlen( wp_strip_all_tags( $content ), 'UTF-8' );
		}
		$stats_cache = [
			'total_words'   => $total_words,
			'last_activity' => $last_activity ?: '',
		];
		set_transient( 'mango_site_stats', $stats_cache, DAY_IN_SECONDS );
	}

	// 将 WordPress 数据传递给前端
	wp_localize_script( 'mango-app', 'MANGO_DATA', [
		'siteUrl'        => site_url(),
		'apiUrl'         => esc_url_raw( rest_url( 'wp/v2' ) ),
		'themeUri'       => get_template_directory_uri(),
		'nonce'          => wp_create_nonce( 'wp_rest' ),
		'randomImageApi' => esc_url_raw( $mango_basic['random_image_api'] ?? '' ),
		'useRandomImage' => ( $mango_basic['use_random_image'] ?? '1' ) === '1',
		'siteStartDate'  => $mango_basic['site_start_date'] ?? '',
		'icpNumber'      => $mango_basic['icp_number'] ?? '',
		'footerText'     => $mango_basic['footer_text'] ?? '',
		'socialLinks'    => [
			'github'   => $mango_social['github'] ?? '',
			'twitter'  => $mango_social['twitter'] ?? '',
			'bilibili' => $mango_social['bilibili'] ?? '',
			'weibo'    => $mango_social['weibo'] ?? '',
			'email'    => $mango_social['email'] ?? '',
			'rss'      => ! empty( $mango_social['rss'] ) ? get_bloginfo( 'rss2_url' ) : '',
		],
		'postDisplay' => [
			'excerpt_length' => intval( $mango_post_display['excerpt_length'] ?? 160 ),
			'show_author'    => ( $mango_post_display['show_author'] ?? '1' ) === '1',
			'show_date'      => ( $mango_post_display['show_date'] ?? '1' ) === '1',
			'show_categories'=> ( $mango_post_display['show_categories'] ?? '1' ) === '1',
		],
		'layout' => [
			'sidebar_position' => $mango_layout['sidebar_position'] ?? 'right',
			'content_width'    => intval( $mango_layout['content_width'] ?? 960 ),
			'archive_layout'   => $mango_layout['archive_layout'] ?? 'grid',
		],
		'sidebar' => [
			'widgets' => $mango_sidebar_widgets,
		],
		'stats' => [
			'total_posts'     => (int) wp_count_posts( 'post' )->publish,
			'total_words'     => $stats_cache['total_words'],
			'last_activity'   => $stats_cache['last_activity'],
			'site_start_date' => $mango_basic['site_start_date'] ?? '',
		],
		'live2d' => [
			'enabled'       => $mango_live2d['enabled'] ?? '1',
			'position'      => $mango_live2d['position'] ?? 'right',
			'mobileHidden'  => $mango_live2d['mobile_hidden'] ?? '1',
			'cdnUrl'        => $mango_live2d['cdn_url'] ?? '',
		],
		'walineServerUrl' => $mango_basic['waline_server_url'] ?? '',
		'commentSystem'   => $mango_basic['comment_system'] ?? 'native',
	] );
}
add_action( 'wp_enqueue_scripts', 'mango_enqueue_scripts' );

/**
 * 启用 WordPress 原生链接管理器（Link Manager）
 * 在后台侧边栏添加「链接」菜单，支持分类和完整 CRUD
 */
add_filter( 'pre_option_link_manager_enabled', '__return_true' );

/**
 * 添加主题支持特性
 */
function mango_theme_setup(): void {
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'html5', [
		'search-form',
		'comment-form',
		'comment-list',
		'gallery',
		'caption',
	] );

	register_nav_menus( [
		'primary'      => __( 'Primary Menu', 'mango' ),
		'category_bar' => __( 'Category Bar', 'mango' ),
	] );
}
add_action( 'after_setup_theme', 'mango_theme_setup' );

/**
 * 为 Mango 主脚本添加 type="module" 属性
 * Vite 8 生产构建产出的 ESM 格式需要 type="module" 加载
 */
function mango_add_module_type( string $tag, string $handle, string $src ): string {
	if ( $handle === 'mango-app' ) {
		$tag = '<script type="module" src="' . esc_url( $src ) . '" id="mango-app-js"></script>';
	}
	return $tag;
}
add_filter( 'script_loader_tag', 'mango_add_module_type', 10, 3 );

/**
 * 为 Gutenberg 代码块添加 language-xxx CSS 类，
 * 使前端 turndown → react-markdown 管线能正确提取语言标识并启用语法高亮
 */
function mango_code_block_add_lang_class( string $block_content, array $block ): string {
	if ( $block['blockName'] === 'core/code' && ! empty( $block['attrs']['language'] ) ) {
		$lang = $block['attrs']['language'];
		// 在 <code> 上添加 language-xxx 类（turndown 通过此类识别语言）
		$block_content = str_replace(
			'<code>',
			'<code class="language-' . esc_attr( $lang ) . '">',
			$block_content
		);
	}
	return $block_content;
}
add_filter( 'render_block', 'mango_code_block_add_lang_class', 10, 2 );

/**
 * 移除不必要的 WordPress 头部输出（SPA 不需要）
 */
remove_action( 'wp_head', 'wp_generator' );
remove_action( 'wp_head', 'wlwmanifest_link' );
remove_action( 'wp_head', 'rsd_link' );
remove_action( 'wp_head', 'feed_links', 2 );
remove_action( 'wp_head', 'feed_links_extra', 3 );

/**
 * 为 SPA 前端路由添加 WordPress 重写规则，确保这些 URL 由 index.php 模板处理。
 */
function mango_add_spa_rewrite_rules(): void {
	$routes = [
		'post/(.+)/?$',
		'topic/([^/]+)/post/([^/]+)/?$',
		'topic/([^/]+)/?$',
		'archives/([0-9]+)\.html$',
		'archives/?$',
		'page/(.+)/?$',
		'category/(.+)/?$',
		'search/?$',
		'links/?$',
		'topics/?$',
		'wiki/([^/]+)/([^/]+)/?$',
		'wiki/([^/]+)/?$',
		'wiki/?$',
		'guestbook/?$',
	];

	foreach ( $routes as $route ) {
		add_rewrite_rule( $route, 'index.php', 'top' );
	}
}
add_action( 'init', 'mango_add_spa_rewrite_rules' );

/** 主题激活时刷新 WordPress 重写规则 */
function mango_flush_on_activation(): void {
	mango_add_spa_rewrite_rules();
	flush_rewrite_rules();
}
add_action( 'after_switch_theme', 'mango_flush_on_activation' );

/** 检测到新的 SPA 路由时刷新重写规则 */
function mango_flush_on_routes_update(): void {
	if ( get_option( 'mango_spa_routes_updated' ) !== '1.1' ) {
		flush_rewrite_rules();
		update_option( 'mango_spa_routes_updated', '1.1' );
	}
}
add_action( 'init', 'mango_flush_on_routes_update' );

/**
 * 阻止 WordPress 对 SPA 前端路由做 canonical 重定向。
 * 例如访问 /post/slug 时 WordPress 不会将其重定向到 /archives/123.html。
 */
function mango_disable_spa_redirect( $redirect_url, $requested_url ) {
	$spa_prefixes = [ '/post/', '/topic/', '/archives', '/page/', '/category/', '/search', '/links', '/topics', '/wiki/', '/guestbook' ];

	$url_path = wp_parse_url( $requested_url, PHP_URL_PATH );

	foreach ( $spa_prefixes as $prefix ) {
		if ( $url_path === rtrim( $prefix, '/' ) || strpos( $url_path, $prefix ) === 0 ) {
			return false;
		}
	}

	return $redirect_url;
}
add_filter( 'redirect_canonical', 'mango_disable_spa_redirect', 10, 2 );
