<?php
/**
 * Wiki system — REST API routes and callbacks
 *
 * Wiki data is stored as a WordPress option (`mango_wiki`).
 * Each wiki project contains metadata and a tree of pages.
 *
 * @package Mango
 */

/**
 * 注册 wiki REST API 路由
 */
function mango_register_wiki_routes(): void {
	// GET /wiki — 获取所有 wiki 项目列表
	register_rest_route( 'mango/v1', '/wiki', [
		'methods'             => 'GET',
		'callback'            => 'mango_get_wiki_projects',
		'permission_callback' => '__return_true',
	] );

	// GET /wiki/{project} — 获取单个 wiki 项目（含完整页面树）
	register_rest_route( 'mango/v1', '/wiki/(?P<project>[a-zA-Z0-9_-]+)', [
		'methods'             => 'GET',
		'callback'            => 'mango_get_wiki_project',
		'permission_callback' => '__return_true',
	] );

	// GET /wiki/{project}/{slug} — 获取单个 wiki 页面
	register_rest_route( 'mango/v1', '/wiki/(?P<project>[a-zA-Z0-9_-]+)/(?P<slug>[a-zA-Z0-9_-]+)', [
		'methods'             => 'GET',
		'callback'            => 'mango_get_wiki_page',
		'permission_callback' => '__return_true',
	] );

	// POST /wiki/save — 保存 wiki 项目数据（管理员）
	register_rest_route( 'mango/v1', '/wiki/save', [
		'methods'             => 'POST',
		'callback'            => 'mango_save_wiki_project',
		'permission_callback' => function (): bool {
			return current_user_can( 'manage_options' );
		},
	] );
}
add_action( 'rest_api_init', 'mango_register_wiki_routes' );

/**
 * 获取所有 wiki 项目列表（不含页面内容）
 */
function mango_get_wiki_projects(): WP_REST_Response {
	$wiki_data = get_option( 'mango_wiki', [] );

	if ( empty( $wiki_data ) ) {
		return new WP_REST_Response( [], 200 );
	}

	$result = [];
	foreach ( $wiki_data as $slug => $project ) {
		$result[] = [
			'id'          => $slug,
			'name'        => $project['name'] ?? $slug,
			'title'       => $project['title'] ?? $project['name'] ?? $slug,
			'subtitle'    => $project['subtitle'] ?? '',
			'icon'        => $project['icon'] ?? '',
			'homepage'    => $project['homepage'] ?? '',
			'page_count'  => count( $project['pages'] ?? [] ),
		];
	}

	return new WP_REST_Response( $result, 200 );
}

/**
 * 获取单个 wiki 项目（含页面树）
 */
function mango_get_wiki_project( WP_REST_Request $request ): WP_REST_Response {
	$project_slug = $request->get_param( 'project' );
	$wiki_data    = get_option( 'mango_wiki', [] );

	if ( ! isset( $wiki_data[ $project_slug ] ) ) {
		return new WP_REST_Response( [ 'error' => 'Wiki 项目不存在' ], 404 );
	}

	$project = $wiki_data[ $project_slug ];

	// 构建树形结构
	$pages     = $project['pages'] ?? [];
	$page_tree = mango_build_wiki_tree( $pages );

	return new WP_REST_Response( [
		'id'          => $project_slug,
		'name'        => $project['name'] ?? $project_slug,
		'title'       => $project['title'] ?? $project['name'] ?? $project_slug,
		'subtitle'    => $project['subtitle'] ?? '',
		'icon'        => $project['icon'] ?? '',
		'homepage'    => $project['homepage'] ?? '',
		'tree'        => $page_tree,
		'pages'       => $pages,
	], 200 );
}

/**
 * 获取单个 wiki 页面
 */
function mango_get_wiki_page( WP_REST_Request $request ): WP_REST_Response {
	$project_slug = $request->get_param( 'project' );
	$page_slug    = $request->get_param( 'slug' );
	$wiki_data    = get_option( 'mango_wiki', [] );

	if ( ! isset( $wiki_data[ $project_slug ] ) ) {
		return new WP_REST_Response( [ 'error' => 'Wiki 项目不存在' ], 404 );
	}

	$project = $wiki_data[ $project_slug ];
	$pages   = $project['pages'] ?? [];

	// 查找页面
	$found_page  = null;
	$found_index = null;
	foreach ( $pages as $index => $page ) {
		if ( $page['id'] === $page_slug ) {
			$found_page  = $page;
			$found_index = $index;
			break;
		}
	}

	if ( $found_page === null ) {
		return new WP_REST_Response( [ 'error' => 'Wiki 页面不存在' ], 404 );
	}

	// 构建导航（上一篇 / 下一篇）
	$all_page_ids = array_values( array_map( function ( $p ) {
		return $p['id'];
	}, $pages ) );

	$prev_slug = $found_index > 0 ? $pages[ $found_index - 1 ]['id'] : null;
	$prev_title = $found_index > 0 ? $pages[ $found_index - 1 ]['title'] : null;
	$next_slug = $found_index < count( $pages ) - 1 ? $pages[ $found_index + 1 ]['id'] : null;
	$next_title = $found_index < count( $pages ) - 1 ? $pages[ $found_index + 1 ]['title'] : null;

	// 构建树形结构
	$page_tree = mango_build_wiki_tree( $pages );

	return new WP_REST_Response( [
		'id'          => $project_slug,
		'name'        => $project['name'] ?? $project_slug,
		'title'       => $project['title'] ?? $project['name'] ?? $project_slug,
		'subtitle'    => $project['subtitle'] ?? '',
		'icon'        => $project['icon'] ?? '',
		'homepage'    => $project['homepage'] ?? '',
		'tree'        => $page_tree,
		'page'        => $found_page,
		'prev'        => $prev_slug ? [ 'slug' => $prev_slug, 'title' => $prev_title ] : null,
		'next'        => $next_slug ? [ 'slug' => $next_slug, 'title' => $next_title ] : null,
	], 200 );
}

/**
 * 将扁平的页面数组构建为树形结构
 */
function mango_build_wiki_tree( array $pages ): array {
	$map   = [];
	$roots = [];

	// 先创建所有节点的映射
	foreach ( $pages as $page ) {
		$map[ $page['id'] ] = [
			'id'       => $page['id'],
			'title'    => $page['title'] ?? '',
			'icon'     => $page['icon'] ?? '',
			'parent'   => $page['parent'] ?? '',
			'order'    => $page['order'] ?? 0,
			'children' => [],
		];
	}

	// 建立层级关系
	foreach ( $map as $id => &$node ) {
		if ( ! empty( $node['parent'] ) && isset( $map[ $node['parent'] ] ) ) {
			$map[ $node['parent'] ]['children'][] = &$node;
		} else {
			$roots[] = &$node;
		}
	}
	unset( $node );

	// 按 order 排序
	$sort_by_order = function ( &$items ) use ( &$sort_by_order ) {
		usort( $items, function ( $a, $b ) {
			return ( $a['order'] ?? 0 ) - ( $b['order'] ?? 0 );
		} );
		foreach ( $items as &$item ) {
			if ( ! empty( $item['children'] ) ) {
				$sort_by_order( $item['children'] );
			}
		}
		unset( $item );
	};
	$sort_by_order( $roots );

	return $roots;
}

/**
 * 保存 wiki 项目数据（管理员接口）
 */
function mango_save_wiki_project( WP_REST_Request $request ): WP_REST_Response {
	$body = $request->get_json_params();
	$slug = sanitize_title( $body['slug'] ?? '' );

	if ( empty( $slug ) ) {
		return new WP_REST_Response( [ 'error' => '项目 slug 不能为空' ], 400 );
	}

	$wiki_data   = get_option( 'mango_wiki', [] );
	$project     = $body['project'] ?? [];

	$sanitized_pages = [];
	if ( isset( $project['pages'] ) && is_array( $project['pages'] ) ) {
		foreach ( $project['pages'] as $page ) {
			$sanitized_pages[] = [
				'id'      => sanitize_title( $page['id'] ?? '' ),
				'title'   => sanitize_text_field( $page['title'] ?? '' ),
				'content' => wp_kses_post( $page['content'] ?? '' ),
				'parent'  => sanitize_title( $page['parent'] ?? '' ),
				'order'   => intval( $page['order'] ?? 0 ),
				'icon'    => esc_url_raw( $page['icon'] ?? '' ),
			];
		}
	}

	$wiki_data[ $slug ] = [
		'name'     => sanitize_text_field( $project['name'] ?? '' ),
		'title'    => sanitize_text_field( $project['title'] ?? '' ),
		'subtitle' => sanitize_text_field( $project['subtitle'] ?? '' ),
		'icon'     => esc_url_raw( $project['icon'] ?? '' ),
		'homepage' => esc_url_raw( $project['homepage'] ?? '' ),
		'pages'    => $sanitized_pages,
	];

	update_option( 'mango_wiki', $wiki_data, false );

	return new WP_REST_Response( [
		'message' => 'Wiki 项目已保存',
		'project' => $wiki_data[ $slug ],
	], 200 );
}
