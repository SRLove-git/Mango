<?php
/**
 * Topics (Column) system — meta, REST API routes, and callbacks
 *
 * @package Mango
 */

/**
 * 注册 topic post meta 并暴露到 REST API
 */
function mango_register_topic_meta(): void {
	register_post_meta( 'post', 'topic', [
		'show_in_rest'      => true,
		'single'            => true,
		'type'              => 'string',
		'default'           => '',
		'sanitize_callback' => 'sanitize_text_field',
	] );
}
add_action( 'init', 'mango_register_topic_meta' );

/**
 * 注册专栏 REST API 路由
 */
function mango_register_topics_routes(): void {
	// GET /topics — 获取所有专栏列表（含关联文章）
	register_rest_route( 'mango/v1', '/topics', [
		'methods'             => 'GET',
		'callback'            => 'mango_get_topics',
		'permission_callback' => '__return_true',
	] );

	// GET /topics/{slug} — 获取单个专栏详情（含关联文章）
	register_rest_route( 'mango/v1', '/topics/(?P<slug>[a-zA-Z0-9_-]+)', [
		'methods'             => 'GET',
		'callback'            => 'mango_get_topic',
		'permission_callback' => '__return_true',
	] );

	// POST /topics/save — 保存专栏数据（管理员）
	register_rest_route( 'mango/v1', '/topics/save', [
		'methods'             => 'POST',
		'callback'            => 'mango_save_topics',
		'permission_callback' => function (): bool {
			return current_user_can( 'manage_options' );
		},
	] );
}
add_action( 'rest_api_init', 'mango_register_topics_routes' );

/**
 * 获取所有专栏列表（含关联文章）
 */
function mango_get_topics(): WP_REST_Response {
	$topics = get_option( 'mango_topics', [] );

	if ( empty( $topics ) ) {
		return new WP_REST_Response( [], 200 );
	}

	// 获取有关联 topic 字段的所有文章
	$posts_query = new WP_Query( [
		'post_type'      => 'post',
		'posts_per_page' => -1,
		'meta_key'       => 'topic',
		'meta_compare'   => 'EXISTS',
	] );

	// 按 topic slug 分组文章
	$posts_by_topic = [];
	if ( $posts_query->have_posts() ) {
		foreach ( $posts_query->posts as $p ) {
			$topic_slug = get_post_meta( $p->ID, 'topic', true );
			if ( ! empty( $topic_slug ) ) {
				if ( ! isset( $posts_by_topic[ $topic_slug ] ) ) {
					$posts_by_topic[ $topic_slug ] = [];
				}
				$posts_by_topic[ $topic_slug ][] = [
					'id'      => $p->ID,
					'title'   => get_the_title( $p ),
					'slug'    => $p->post_name,
					'date'    => $p->post_date,
					'excerpt' => get_the_excerpt( $p ),
				];
			}
		}
	}

	$result = [];
	foreach ( $topics as $slug => $topic ) {
		$posts = $posts_by_topic[ $slug ] ?? [];

		// 排序
		$order_by = $topic['order_by'] ?? '-date';
		usort( $posts, function ( $a, $b ) use ( $order_by ) {
			if ( $order_by === 'date' ) {
				return strcmp( $a['date'], $b['date'] );
			}
			return strcmp( $b['date'], $a['date'] ); // -date 降序
		} );

		$result[] = [
			'id'          => $slug,
			'name'        => $topic['name'] ?? $slug,
			'title'       => $topic['title'] ?? $topic['name'] ?? $slug,
			'description' => $topic['description'] ?? '',
			'icon'        => $topic['icon'] ?? '',
			'order_by'    => $order_by,
			'post_count'  => count( $posts ),
			'posts'       => $posts,
		];
	}

	return new WP_REST_Response( $result, 200 );
}

/**
 * 获取单个专栏详情（含关联文章）
 */
function mango_get_topic( WP_REST_Request $request ): WP_REST_Response {
	$slug   = $request->get_param( 'slug' );
	$topics = get_option( 'mango_topics', [] );

	if ( ! isset( $topics[ $slug ] ) ) {
		return new WP_REST_Response( [ 'error' => '专栏不存在' ], 404 );
	}

	$topic = $topics[ $slug ];

	// 获取该专栏下的所有文章
	$posts_query = new WP_Query( [
		'post_type'      => 'post',
		'posts_per_page' => -1,
		'meta_key'       => 'topic',
		'meta_value'     => $slug,
	] );

	$posts = [];
	if ( $posts_query->have_posts() ) {
		foreach ( $posts_query->posts as $p ) {
			$thumbnail  = get_the_post_thumbnail_url( $p->ID, 'full' );
			$categories = wp_get_post_categories( $p->ID, [ 'fields' => 'all' ] );
			$cat_data   = [];
			foreach ( $categories as $cat ) {
				$cat_data[] = [
					'id'   => $cat->term_id,
					'name' => $cat->name,
					'slug' => $cat->slug,
				];
			}

			$posts[] = [
				'id'         => $p->ID,
				'title'      => get_the_title( $p ),
				'slug'       => $p->post_name,
				'date'       => $p->post_date,
				'excerpt'    => get_the_excerpt( $p ),
				'thumbnail'  => $thumbnail ?: '',
				'categories' => $cat_data,
			];
		}
	}

	// 排序
	$order_by = $topic['order_by'] ?? '-date';
	usort( $posts, function ( $a, $b ) use ( $order_by ) {
		if ( $order_by === 'date' ) {
			return strcmp( $a['date'], $b['date'] );
		}
		return strcmp( $b['date'], $a['date'] );
	} );

	return new WP_REST_Response( [
		'id'          => $slug,
		'name'        => $topic['name'] ?? $slug,
		'title'       => $topic['title'] ?? $topic['name'] ?? $slug,
		'description' => $topic['description'] ?? '',
		'icon'        => $topic['icon'] ?? '',
		'order_by'    => $order_by,
		'post_count'  => count( $posts ),
		'posts'       => $posts,
	], 200 );
}

/**
 * 保存专栏数据（管理员接口）
 */
function mango_save_topics( WP_REST_Request $request ): WP_REST_Response {
	$topics = $request->get_json_params();

	if ( ! is_array( $topics ) ) {
		return new WP_REST_Response( [ 'error' => '数据格式错误' ], 400 );
	}

	// 净化数据
	$sanitized = [];
	foreach ( $topics as $slug => $topic ) {
		$slug = sanitize_title( $slug );
		if ( empty( $slug ) ) {
			continue;
		}

		$sanitized[ $slug ] = [
			'name'        => sanitize_text_field( $topic['name'] ?? '' ),
			'title'       => sanitize_text_field( $topic['title'] ?? '' ),
			'description' => sanitize_textarea_field( $topic['description'] ?? '' ),
			'icon'        => esc_url_raw( $topic['icon'] ?? '' ),
			'order_by'    => ( $topic['order_by'] ?? '-date' ) === 'date' ? 'date' : '-date',
		];
	}

	update_option( 'mango_topics', $sanitized, false );

	return new WP_REST_Response( [ 'message' => '专栏数据已保存', 'topics' => $sanitized ], 200 );
}
