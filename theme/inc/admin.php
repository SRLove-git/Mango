<?php
/**
 * WordPress admin settings page and associated assets
 *
 * @package Mango
 */

/**
 * 在后台侧边栏添加 Mango 主题设置菜单
 */
function mango_add_admin_menu(): void {
	add_menu_page(
		__( 'Mango 主题设置', 'mango' ),
		__( 'Mango 主题设置', 'mango' ),
		'manage_options',
		'mango-settings',
		'mango_render_admin_page',
		'dashicons-admin-customizer',
		61
	);
}
add_action( 'admin_menu', 'mango_add_admin_menu' );

/**
 * 加载管理页面所需的资源（颜色选择器）
 */
function mango_admin_enqueue_assets( string $hook ): void {
	if ( $hook !== 'toplevel_page_mango-settings' ) {
		return;
	}
	wp_enqueue_style( 'wp-color-picker' );
	wp_enqueue_script( 'wp-color-picker' );
	wp_add_inline_script( 'wp-color-picker', '
		jQuery(function($){
			$(".mango-color-picker").wpColorPicker();
		});
	' );
}
add_action( 'admin_enqueue_scripts', 'mango_admin_enqueue_assets' );

/**
 * 渲染设置页面（双标签）
 */
function mango_render_admin_page(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	// 基本设置
	if ( isset( $_POST['mango_save'] ) ) {
		check_admin_referer( 'mango_settings_action', 'mango_settings_nonce' );

		// 基本设置（仅在基本设置字段存在时保存，避免被主题设置保存覆盖）
		if ( isset( $_POST['mango_site_logo'] ) ) {
			$basic = [
				'site_logo'        => esc_url_raw( $_POST['mango_site_logo'] ?? '' ),
				'avatar_url'       => esc_url_raw( $_POST['mango_avatar_url'] ?? '' ),
				'footer_text'      => sanitize_text_field( $_POST['mango_footer_text'] ?? '' ),
				'random_image_api' => esc_url_raw( $_POST['mango_random_image_api'] ?? '' ),
				'use_random_image' => isset( $_POST['mango_use_random_image'] ) ? '1' : '0',
				'site_start_date'  => sanitize_text_field( $_POST['mango_site_start_date'] ?? '' ),
				'icp_number'       => sanitize_text_field( $_POST['mango_icp_number'] ?? '' ),
			];
			update_option( 'mango_basic_settings', $basic );
		}

		// 处理自定义配色方案
		$schemes = get_option( 'mango_color_schemes', [] );
		$changed = false;

		// 删除方案
		if ( ! empty( $_POST['mango_delete_scheme'] ) ) {
			$delete_id = sanitize_text_field( $_POST['mango_delete_scheme'] );
			$schemes   = array_values( array_filter( $schemes, function ( $s ) use ( $delete_id ) {
				return $s['id'] !== $delete_id;
			} ) );
			$changed   = true;
		}

		// 添加新方案
		if ( ! empty( $_POST['mango_new_scheme_name'] ) ) {
			$new_scheme = [
				'id'   => 'custom_' . uniqid(),
				'name' => sanitize_text_field( $_POST['mango_new_scheme_name'] ),
			];
			$color_keys = [ 'bg', 'glass', 'glass_hover', 'border', 'border_hover', 'accent', 'accent_glow', 'text', 'text_muted', 'text_dim' ];
			foreach ( $color_keys as $k ) {
				$new_scheme[ $k ] = sanitize_hex_color( $_POST[ 'mango_new_' . $k ] ?? '' );
			}
			$schemes[] = $new_scheme;
			$changed   = true;
		}

		// 更新已有方案
		if ( ! empty( $_POST['mango_edit_scheme'] ) ) {
			$edit_ids = $_POST['mango_edit_scheme'];
			foreach ( $schemes as &$s ) {
				if ( isset( $edit_ids[ $s['id'] ] ) ) {
					$color_keys = [ 'bg', 'glass', 'glass_hover', 'border', 'border_hover', 'accent', 'accent_glow', 'text', 'text_muted', 'text_dim' ];
					foreach ( $color_keys as $k ) {
						$s[ $k ] = sanitize_hex_color( $_POST[ 'mango_color_' . $s['id'] . '_' . $k ] ?? '' );
					}
				}
			}
			unset( $s );
			$changed = true;
		}

		// 保存方案
		if ( $changed ) {
			update_option( 'mango_color_schemes', $schemes );
		}

		// 应用主题方案
		if ( ! empty( $_POST['mango_theme_style'] ) ) {
			set_theme_mod( 'mango_theme_style', sanitize_text_field( $_POST['mango_theme_style'] ) );
		}

		// 保存卡片圆角
		if ( isset( $_POST['mango_card_radius'] ) ) {
			$radius = intval( $_POST['mango_card_radius'] );
			$radius = max( 0, min( 50, $radius ) );
			set_theme_mod( 'mango_card_radius', $radius );
		}

		// 布局设置（主题设置 tab）
		if ( isset( $_POST['mango_sidebar_position'] ) ) {
			$layout = [
				'sidebar_position' => in_array( $_POST['mango_sidebar_position'], [ 'left', 'right', 'none' ] ) ? $_POST['mango_sidebar_position'] : 'right',
				'content_width'    => max( 600, min( 1400, intval( $_POST['mango_content_width'] ?? 960 ) ) ),
				'archive_layout'   => in_array( $_POST['mango_archive_layout'] ?? '', [ 'grid', 'list' ] ) ? $_POST['mango_archive_layout'] : 'grid',
			];
			set_theme_mod( 'mango_layout_settings', $layout );
		}

		// 文章显示设置（主题设置 tab）
		if ( isset( $_POST['mango_excerpt_length'] ) ) {
			$post_display = [
				'excerpt_length' => max( 0, min( 500, intval( $_POST['mango_excerpt_length'] ) ) ),
				'show_author'    => isset( $_POST['mango_show_author'] ) ? '1' : '0',
				'show_date'      => isset( $_POST['mango_show_date'] ) ? '1' : '0',
				'show_categories'=> isset( $_POST['mango_show_categories'] ) ? '1' : '0',
			];
			set_theme_mod( 'mango_post_display_settings', $post_display );
		}

		// 侧边栏管理（侧边栏 tab）
		if ( isset( $_POST['mango_sidebar_widgets'] ) ) {
			$raw     = json_decode( wp_unslash( $_POST['mango_sidebar_widgets'] ), true );
			$widgets = [];
			if ( is_array( $raw ) ) {
				$valid_types = [ 'profile', 'categories', 'tags', 'topics', 'wiki_tree', 'toc', 'about', 'site_info', 'custom_html' ];
				$valid_pages = [ 'home', 'post', 'category', 'topic', 'topics', 'wiki', 'wiki_list', 'search', 'archive', 'page', 'links' ];
				foreach ( $raw as $w ) {
					$display_on = [];
					if ( ! empty( $w['display_on'] ) && is_array( $w['display_on'] ) ) {
						foreach ( $w['display_on'] as $p ) {
							if ( in_array( $p, $valid_pages, true ) ) {
								$display_on[] = $p;
							}
						}
					}
					$widgets[] = [
						'id'         => sanitize_text_field( $w['id'] ?? 'w_' . uniqid() ),
						'side'       => in_array( $w['side'] ?? '', [ 'left', 'right' ] ) ? $w['side'] : 'left',
						'type'       => in_array( $w['type'] ?? '', $valid_types ) ? $w['type'] : 'profile',
						'title'      => sanitize_text_field( $w['title'] ?? '' ),
						'content'    => wp_kses_post( $w['content'] ?? '' ),
						'order'      => intval( $w['order'] ?? 0 ),
						'display_on' => $display_on,
					];
				}
			}
			update_option( 'mango_sidebar_widgets', $widgets );
		}

		// 社交链接（高级设置 tab）
		if ( isset( $_POST['mango_social_links'] ) ) {
			$social_links = array_map( 'esc_url_raw', $_POST['mango_social_links'] );
			update_option( 'mango_social_links', $social_links, false );
		}

		// 统计代码 & 自定义代码（高级设置 tab）
		if ( isset( $_POST['mango_header_code'] ) ) {
			update_option( 'mango_tracking_codes', [
				'header' => wp_unslash( $_POST['mango_header_code'] ),
				'footer' => wp_unslash( $_POST['mango_footer_code'] ?? '' ),
			], false );
		}

		if ( isset( $_POST['mango_custom_css'] ) ) {
			update_option( 'mango_custom_code', [
				'css' => wp_unslash( $_POST['mango_custom_css'] ),
				'js'  => wp_unslash( $_POST['mango_custom_js'] ?? '' ),
			], false );
		}

		// SEO 设置（高级设置 tab）
		if ( isset( $_POST['mango_seo_home_title'] ) ) {
			$seo = [
				'home_title'       => sanitize_text_field( $_POST['mango_seo_home_title'] ),
				'home_description' => sanitize_textarea_field( $_POST['mango_seo_home_description'] ?? '' ),
				'home_keywords'    => sanitize_text_field( $_POST['mango_seo_home_keywords'] ?? '' ),
			];
			update_option( 'mango_seo_settings', $seo, false );
		}

		echo '<div class="notice notice-success is-dismissible"><p>' . __( '设置已保存。', 'mango' ) . '</p></div>';
	}

	// 读取当前值
	$style             = get_theme_mod( 'mango_theme_style', 'anime' );
	$card_radius       = get_theme_mod( 'mango_card_radius', 25 );
	$basic             = get_option( 'mango_basic_settings', [] );
	$site_logo         = $basic['site_logo'] ?? '';
	$avatar_url        = $basic['avatar_url'] ?? '';
	$footer_text       = $basic['footer_text'] ?? '';
	$random_image_api  = $basic['random_image_api'] ?? '';
	$use_random_image  = $basic['use_random_image'] ?? '1';
	$site_start_date   = $basic['site_start_date'] ?? '';
	$icp_number        = $basic['icp_number'] ?? '';

	// 读取布局设置
	$layout           = get_theme_mod( 'mango_layout_settings', [] );
	$sidebar_position = $layout['sidebar_position'] ?? 'right';
	$content_width    = $layout['content_width'] ?? 960;
	$archive_layout   = $layout['archive_layout'] ?? 'grid';

	// 读取文章显示设置
	$post_display   = get_theme_mod( 'mango_post_display_settings', [] );
	$excerpt_length = $post_display['excerpt_length'] ?? 160;
	$show_author    = $post_display['show_author'] ?? '1';
	$show_date      = $post_display['show_date'] ?? '1';
	$show_categories= $post_display['show_categories'] ?? '1';

	// 读取侧边栏配置
	$sidebar_widgets = get_option( 'mango_sidebar_widgets', [] );
	if ( empty( $sidebar_widgets ) ) {
		$sidebar_widgets = [
			[ 'id' => 'w_profile', 'side' => 'left', 'type' => 'profile', 'title' => '', 'content' => '', 'order' => 1, 'display_on' => [] ],
			[ 'id' => 'w_categories', 'side' => 'left', 'type' => 'categories', 'title' => '', 'content' => '', 'order' => 2, 'display_on' => [] ],
			[ 'id' => 'w_topics', 'side' => 'left', 'type' => 'topics', 'title' => '', 'content' => '', 'order' => 3, 'display_on' => [] ],
			[ 'id' => 'w_about', 'side' => 'left', 'type' => 'about', 'title' => '', 'content' => 'Mango 是一个基于 WordPress + React 的个人博客主题，追求极致的视觉体验与性能。', 'order' => 4, 'display_on' => [] ],
			[ 'id' => 'w_tags', 'side' => 'right', 'type' => 'tags', 'title' => '', 'content' => '', 'order' => 1, 'display_on' => [] ],
			[ 'id' => 'w_site_info', 'side' => 'right', 'type' => 'site_info', 'title' => '', 'content' => '', 'order' => 2, 'display_on' => [] ],
		];
	}

	// 读取社交链接
	$social_links = get_option( 'mango_social_links', [] );

	// 读取统计代码
	$tracking_codes = get_option( 'mango_tracking_codes', [] );
	$header_code    = $tracking_codes['header'] ?? '';
	$footer_code    = $tracking_codes['footer'] ?? '';

	// 读取自定义 CSS/JS
	$custom_code = get_option( 'mango_custom_code', [] );
	$custom_css  = $custom_code['css'] ?? '';
	$custom_js   = $custom_code['js'] ?? '';

	// 读取 SEO 设置
	$seo_settings      = get_option( 'mango_seo_settings', [] );
	$seo_home_title     = $seo_settings['home_title'] ?? '';
	$seo_home_desc      = $seo_settings['home_description'] ?? '';
	$seo_home_keywords  = $seo_settings['home_keywords'] ?? '';

	// 读取自定义配色方案
	$schemes = get_option( 'mango_color_schemes', [] );
	$tab     = $_GET['tab'] ?? 'basic';
	?>

	<div class="wrap mango-settings-page">
		<div class="mango-page-header">
			<div class="mango-header-brand">
				<div class="mango-header-logo">
					<span class="dashicons dashicons-admin-customizer"></span>
				</div>
				<div class="mango-header-text">
					<h1><?php _e( 'Mango 主题设置', 'mango' ); ?></h1>
					<p class="mango-header-subtitle"><?php _e( '自定义你的 WordPress 博客主题', 'mango' ); ?></p>
				</div>
			</div>
			<div class="mango-header-version">
				<span class="mango-version-badge">v<?php echo wp_get_theme( 'mango' )->get( 'Version' ); ?></span>
			</div>
		</div>

		<div class="mango-settings-wrap">
			<!-- 侧边选项卡导航 -->
			<div class="mango-settings-sidebar">
				<a href="?page=mango-settings&tab=basic"
				   class="mango-sidebar-tab <?php echo $tab === 'basic' ? 'active' : ''; ?>">
					<span class="dashicons dashicons-admin-generic"></span>
					<span class="mango-tab-label"><?php _e( '基本设置', 'mango' ); ?></span>
				</a>
				<a href="?page=mango-settings&tab=theme"
				   class="mango-sidebar-tab <?php echo $tab === 'theme' ? 'active' : ''; ?>">
					<span class="dashicons dashicons-art"></span>
					<span class="mango-tab-label"><?php _e( '主题设置', 'mango' ); ?></span>
				</a>
				<a href="?page=mango-settings&tab=topics"
				   class="mango-sidebar-tab <?php echo $tab === 'topics' ? 'active' : ''; ?>">
					<span class="dashicons dashicons-welcome-write-blog"></span>
					<span class="mango-tab-label"><?php _e( '专栏管理', 'mango' ); ?></span>
				</a>
				<a href="?page=mango-settings&tab=sidebar"
				   class="mango-sidebar-tab <?php echo $tab === 'sidebar' ? 'active' : ''; ?>">
					<span class="dashicons dashicons-layout"></span>
					<span class="mango-tab-label"><?php _e( '侧边栏', 'mango' ); ?></span>
				</a>
				<a href="?page=mango-settings&tab=wiki"
				   class="mango-sidebar-tab <?php echo $tab === 'wiki' ? 'active' : ''; ?>">
					<span class="dashicons dashicons-book-alt"></span>
					<span class="mango-tab-label"><?php _e( 'Wiki 管理', 'mango' ); ?></span>
				</a>
				<a href="?page=mango-settings&tab=advanced"
				   class="mango-sidebar-tab <?php echo $tab === 'advanced' ? 'active' : ''; ?>">
					<span class="dashicons dashicons-admin-settings"></span>
					<span class="mango-tab-label"><?php _e( '高级设置', 'mango' ); ?></span>
				</a>
			</div>

			<!-- 内容区 -->
			<div class="mango-settings-content">
				<form method="post" action="">
					<?php wp_nonce_field( 'mango_settings_action', 'mango_settings_nonce' ); ?>

					<?php if ( $tab === 'basic' ): ?>

					<h2><?php _e( '基本设置', 'mango' ); ?></h2>
					<p class="description"><?php _e( '配置网站的基本信息。', 'mango' ); ?></p>

					<table class="form-table">
						<tr>
							<th scope="row"><label for="mango_site_logo"><?php _e( '站点 Logo URL', 'mango' ); ?></label></th>
							<td>
								<input type="url" id="mango_site_logo" name="mango_site_logo"
									   value="<?php echo esc_attr( $site_logo ); ?>" class="regular-text"
									   placeholder="https://example.com/logo.png">
								<p class="description"><?php _e( '网站 Logo 图片地址，留空使用文字 Logo。', 'mango' ); ?></p>
							</td>
						</tr>
						<tr>
							<th scope="row"><label for="mango_avatar_url"><?php _e( '头像 URL', 'mango' ); ?></label></th>
							<td>
								<input type="url" id="mango_avatar_url" name="mango_avatar_url"
									   value="<?php echo esc_attr( $avatar_url ); ?>" class="regular-text"
									   placeholder="https://example.com/avatar.jpg">
								<p class="description"><?php _e( '侧栏头像图片地址，留空使用 Gravatar。', 'mango' ); ?></p>
							</td>
						</tr>
						<tr>
							<th scope="row"><label for="mango_random_image_api"><?php _e( '随机图片 API', 'mango' ); ?></label></th>
							<td>
								<input type="url" id="mango_random_image_api" name="mango_random_image_api"
									   value="<?php echo esc_attr( $random_image_api ); ?>" class="regular-text"
									   placeholder="https://uapis.cn/api/v1/random/image">
								<p class="description"><?php _e( '文章无特色图片时使用的随机图片 API 地址。留空使用默认值。', 'mango' ); ?></p>
							</td>
						</tr>
						<tr>
							<th scope="row"><?php _e( '随机图片兜底', 'mango' ); ?></th>
							<td>
								<label>
									<input type="checkbox" id="mango_use_random_image" name="mango_use_random_image" value="1" <?php checked( $use_random_image, '1' ); ?>>
									<?php _e( '文章无特色图片时使用随机图片作为缩略图', 'mango' ); ?>
								</label>
							</td>
						</tr>
						<tr>
							<th scope="row"><label for="mango_footer_text"><?php _e( '页脚文字', 'mango' ); ?></label></th>
							<td>
								<input type="text" id="mango_footer_text" name="mango_footer_text"
									   value="<?php echo esc_attr( $footer_text ); ?>" class="regular-text"
									   placeholder="<?php _e( '© 2026 Mango Theme', 'mango' ); ?>">
							</td>
						</tr>
						<tr>
							<th scope="row"><label for="mango_site_start_date"><?php _e( '网站创建日期', 'mango' ); ?></label></th>
							<td>
								<input type="date" id="mango_site_start_date" name="mango_site_start_date"
									   value="<?php echo esc_attr( $site_start_date ); ?>"
									   max="<?php echo date( 'Y-m-d' ); ?>">
								<p class="description"><?php _e( '设置网站上线日期，前端将自动显示「网站已运行 xx 天」。', 'mango' ); ?></p>
							</td>
						</tr>
						<tr>
							<th scope="row"><label for="mango_icp_number"><?php _e( 'ICP 备案号', 'mango' ); ?></label></th>
							<td>
								<input type="text" id="mango_icp_number" name="mango_icp_number"
									   value="<?php echo esc_attr( $icp_number ); ?>" class="regular-text"
									   placeholder="<?php _e( '京ICP备XXXXXXXX号', 'mango' ); ?>">
								<p class="description"><?php _e( '填入备案号后将在前端页脚显示。', 'mango' ); ?></p>
							</td>
						</tr>
					</table>

					<p class="submit">
						<button type="submit" name="mango_save" class="button button-primary">
							<?php _e( '保存设置', 'mango' ); ?>
						</button>
					</p>

					<?php elseif ( $tab === 'topics' ): /* === 专栏管理选项卡 === */ ?>

					<h2><?php _e( '专栏管理', 'mango' ); ?></h2>
					<p class="description"><?php _e( '管理博客专栏。在文章编辑页面的「自定义字段」中添加 <code>topic</code> 键（值为专栏 ID）将文章关联到专栏。', 'mango' ); ?></p>

					<?php
					$topics       = get_option( 'mango_topics', [] );
					$all_posts    = get_posts( [
						'post_type'      => 'post',
						'posts_per_page' => -1,
						'meta_key'       => 'topic',
						'meta_compare'   => 'EXISTS',
					] );
					$posts_by_topic = [];
					foreach ( $all_posts as $p ) {
						$slug = get_post_meta( $p->ID, 'topic', true );
						if ( ! empty( $slug ) ) {
							$posts_by_topic[ $slug ][] = $p;
						}
					}
					?>

					<div id="mango-topics-admin">
						<!-- 新建专栏按钮 -->
						<div class="mango-topics-toolbar">
							<button type="button" class="button mango-btn-add-topic">
								<span class="dashicons dashicons-plus-alt2"></span>
								<?php _e( '新建专栏', 'mango' ); ?>
							</button>
						</div>

						<!-- 新建专栏表单（折叠） -->
						<div class="mango-topic-form-new" id="mango-topic-form-new" style="display:none;">
							<div class="mango-topic-form-inner">
								<h4><?php _e( '新建专栏', 'mango' ); ?></h4>
								<div class="mango-topic-fields">
									<div class="mango-field-row">
										<div class="mango-field mango-field-id">
											<label for="mango_new_topic_id"><?php _e( '专栏 ID', 'mango' ); ?></label>
											<input type="text" id="mango_new_topic_id" class="mango-input" placeholder="clearn">
											<p class="mango-field-desc"><?php _e( '唯一标识，只能包含小写字母、数字、下划线、连字符。', 'mango' ); ?></p>
										</div>
										<div class="mango-field mango-field-name">
											<label for="mango_new_topic_name"><?php _e( '短名称', 'mango' ); ?></label>
											<input type="text" id="mango_new_topic_name" class="mango-input" placeholder="<?php _e( 'C语言', 'mango' ); ?>">
											<p class="mango-field-desc"><?php _e( '用于面包屑导航等紧凑显示。', 'mango' ); ?></p>
										</div>
									</div>
									<div class="mango-field-row">
										<div class="mango-field mango-field-title">
											<label for="mango_new_topic_title"><?php _e( '完整标题', 'mango' ); ?></label>
											<input type="text" id="mango_new_topic_title" class="mango-input" placeholder="<?php _e( 'C语言程序设计', 'mango' ); ?>">
										</div>
										<div class="mango-field mango-field-icon">
											<label for="mango_new_topic_icon"><?php _e( '图标 URL', 'mango' ); ?></label>
											<input type="url" id="mango_new_topic_icon" class="mango-input" placeholder="https://example.com/icon.png">
										</div>
									</div>
									<div class="mango-field">
										<label for="mango_new_topic_desc"><?php _e( '描述', 'mango' ); ?></label>
										<textarea id="mango_new_topic_desc" class="mango-input mango-textarea" rows="2" placeholder="<?php _e( 'C语言程序设计课程OJ...', 'mango' ); ?>"></textarea>
									</div>
								</div>
								<div class="mango-topic-form-actions">
									<button type="button" class="button button-primary mango-btn-save-new-topic"><?php _e( '保存', 'mango' ); ?></button>
									<button type="button" class="button mango-btn-cancel-new-topic"><?php _e( '取消', 'mango' ); ?></button>
								</div>
							</div>
						</div>

						<!-- 专栏列表 -->
						<div id="mango-topics-list">
							<?php if ( empty( $topics ) ): ?>
								<div class="mango-topics-empty">
									<span class="dashicons dashicons-welcome-write-blog"></span>
									<p><?php _e( '暂无专栏，点击上方按钮添加。', 'mango' ); ?></p>
								</div>
							<?php else: ?>
								<?php foreach ( $topics as $slug => $topic ): ?>
									<?php $topic_posts = $posts_by_topic[ $slug ] ?? []; ?>
									<div class="mango-topic-card" data-slug="<?php echo esc_attr( $slug ); ?>">
										<div class="mango-topic-card-body">
											<div class="mango-topic-card-main">
												<div class="mango-topic-card-icon">
													<?php if ( ! empty( $topic['icon'] ) ): ?>
														<img src="<?php echo esc_url( $topic['icon'] ); ?>" alt="">
													<?php else: ?>
														<span class="dashicons dashicons-category"></span>
													<?php endif; ?>
												</div>
												<div class="mango-topic-card-info">
													<strong class="mango-topic-card-name"><?php echo esc_html( $topic['title'] ?? $topic['name'] ?? $slug ); ?></strong>
													<span class="mango-topic-card-meta">
														<code><?php echo esc_html( $slug ); ?></code>
														<span class="mango-topic-card-count"><?php echo count( $topic_posts ); ?> 篇文章</span>
													</span>
													<?php if ( ! empty( $topic['description'] ) ): ?>
														<p class="mango-topic-card-desc"><?php echo esc_html( $topic['description'] ); ?></p>
													<?php endif; ?>
												</div>
											</div>
											<div class="mango-topic-card-actions">
												<button type="button" class="button mango-topic-btn-edit" title="<?php _e( '编辑', 'mango' ); ?>">
													<span class="dashicons dashicons-edit"></span>
												</button>
												<button type="button" class="button mango-topic-btn-delete" data-slug="<?php echo esc_attr( $slug ); ?>" title="<?php _e( '删除', 'mango' ); ?>">
													<span class="dashicons dashicons-trash"></span>
												</button>
											</div>
										</div>

										<?php if ( ! empty( $topic_posts ) ): ?>
											<div class="mango-topic-card-posts">
												<span class="mango-topic-posts-label"><?php _e( '关联文章', 'mango' ); ?></span>
												<div class="mango-topic-posts-list">
													<?php foreach ( $topic_posts as $tp ): ?>
														<a href="<?php echo get_edit_post_link( $tp->ID ); ?>" target="_blank" class="mango-topic-post-link">
															<span class="dashicons dashicons-admin-post"></span>
															<?php echo esc_html( $tp->post_title ); ?>
														</a>
													<?php endforeach; ?>
												</div>
											</div>
										<?php endif; ?>

										<!-- 内联编辑表单 -->
										<div class="mango-topic-inline-edit" style="display:none;">
											<div class="mango-topic-inline-fields">
												<div class="mango-field">
													<label><?php _e( '短名称', 'mango' ); ?></label>
													<input type="text" class="mango-input mango-inline-name" value="<?php echo esc_attr( $topic['name'] ?? '' ); ?>">
												</div>
												<div class="mango-field">
													<label><?php _e( '完整标题', 'mango' ); ?></label>
													<input type="text" class="mango-input mango-inline-title" value="<?php echo esc_attr( $topic['title'] ?? '' ); ?>">
												</div>
												<div class="mango-field">
													<label><?php _e( '描述', 'mango' ); ?></label>
													<textarea class="mango-input mango-textarea mango-inline-desc" rows="2"><?php echo esc_textarea( $topic['description'] ?? '' ); ?></textarea>
												</div>
												<div class="mango-field">
													<label><?php _e( '图标 URL', 'mango' ); ?></label>
													<input type="url" class="mango-input mango-inline-icon" value="<?php echo esc_attr( $topic['icon'] ?? '' ); ?>" placeholder="https://example.com/icon.png">
												</div>
											</div>
											<div class="mango-topic-inline-actions">
												<button type="button" class="button button-primary mango-btn-save-edit" data-slug="<?php echo esc_attr( $slug ); ?>"><?php _e( '保存修改', 'mango' ); ?></button>
												<button type="button" class="button mango-btn-cancel-edit"><?php _e( '取消', 'mango' ); ?></button>
											</div>
										</div>
									</div>
								<?php endforeach; ?>
							<?php endif; ?>
						</div>
					</div>

					<script>
					jQuery(function($) {
						var topics = <?php echo json_encode( $topics ); ?>;
						var $newForm = $('#mango-topic-form-new');

						// 新建专栏：显示/隐藏表单
						$('.mango-btn-add-topic').on('click', function() {
							$newForm.slideToggle(180);
							// 收起所有内联编辑
							$('.mango-topic-inline-edit:visible').slideUp(180);
						});
						$('.mango-btn-cancel-new-topic').on('click', function() {
							$newForm.slideUp(180);
							$newForm.find('input, textarea').val('');
						});

						// 保存新建专栏
						$('.mango-btn-save-new-topic').on('click', function() {
							var slug = $('#mango_new_topic_id').val().trim();
							var name = $('#mango_new_topic_name').val().trim();

							if (!slug) { alert('请输入专栏 ID'); return; }
							if (!/^[a-z0-9_-]+$/.test(slug)) { alert('专栏 ID 只能包含小写字母、数字、下划线、连字符'); return; }
							if (!name) { alert('请输入短名称'); return; }

							if (topics[slug]) {
								if (!confirm('专栏 "' + slug + '" 已存在，是否覆盖？')) return;
							}

							topics[slug] = {
								name: name,
								title: $('#mango_new_topic_title').val().trim() || name,
								description: $('#mango_new_topic_desc').val().trim(),
								icon: $('#mango_new_topic_icon').val().trim(),
								order_by: '-date',
							};

							var btn = $(this).prop('disabled', true).text('保存中...');
							$.ajax({
								url: '<?php echo rest_url( 'mango/v1/topics/save' ); ?>',
								method: 'POST',
								data: JSON.stringify(topics),
								contentType: 'application/json',
								beforeSend: function(xhr) {
									xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce( 'wp_rest' ); ?>');
								},
								success: function() { location.reload(); },
								error: function() { alert('保存失败，请重试'); btn.prop('disabled', false).text('保存'); }
							});
						});

						// 编辑专栏：展开内联编辑
						$(document).on('click', '.mango-topic-btn-edit', function() {
							var $card = $(this).closest('.mango-topic-card');
							var $editForm = $card.find('.mango-topic-inline-edit');
							var isVisible = $editForm.is(':visible');

							// 收起所有编辑
							$('.mango-topic-inline-edit:visible').slideUp(180);
							$newForm.slideUp(180);

							if (!isVisible) {
								$editForm.slideDown(180);
							}
						});

						// 取消编辑
						$(document).on('click', '.mango-btn-cancel-edit', function() {
							$(this).closest('.mango-topic-inline-edit').slideUp(180);
						});

						// 保存编辑
						$(document).on('click', '.mango-btn-save-edit', function() {
							var $btn = $(this);
							var slug = $btn.data('slug');
							var $editForm = $btn.closest('.mango-topic-inline-edit');

							var name = $editForm.find('.mango-inline-name').val().trim();
							if (!name) { alert('请输入短名称'); return; }

							topics[slug] = {
								name: name,
								title: $editForm.find('.mango-inline-title').val().trim() || name,
								description: $editForm.find('.mango-inline-desc').val().trim(),
								icon: $editForm.find('.mango-inline-icon').val().trim(),
								order_by: '-date',
							};

							$btn.prop('disabled', true).text('保存中...');
							$.ajax({
								url: '<?php echo rest_url( 'mango/v1/topics/save' ); ?>',
								method: 'POST',
								data: JSON.stringify(topics),
								contentType: 'application/json',
								beforeSend: function(xhr) {
									xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce( 'wp_rest' ); ?>');
								},
								success: function() { location.reload(); },
								error: function() { alert('保存失败，请重试'); $btn.prop('disabled', false).text('保存修改'); }
							});
						});

						// 删除专栏
						$(document).on('click', '.mango-topic-btn-delete', function() {
							var slug = $(this).data('slug');
							if (!confirm('确定要删除专栏 "' + slug + '" 吗？（不会删除关联的文章）')) return;

							delete topics[slug];

							var $btn = $(this).prop('disabled', true);
							$.ajax({
								url: '<?php echo rest_url( 'mango/v1/topics/save' ); ?>',
								method: 'POST',
								data: JSON.stringify(topics),
								contentType: 'application/json',
								beforeSend: function(xhr) {
									xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce( 'wp_rest' ); ?>');
								},
								success: function() { location.reload(); },
								error: function() { alert('删除失败，请重试'); $btn.prop('disabled', false); }
							});
						});
					});
					</script>

					<style>
					#mango-topics-admin { max-width: 820px; }

					/* ===== Toolbar ===== */
					.mango-topics-toolbar { margin-bottom: 16px; }
					.mango-btn-add-topic {
						display: inline-flex !important;
						align-items: center;
						gap: 4px;
						background: linear-gradient(135deg, #7c3aed, #6d28d9) !important;
						color: #fff !important;
						border: none !important;
						border-radius: 8px !important;
						padding: 6px 18px !important;
						font-size: 13px !important;
						font-weight: 600 !important;
						box-shadow: 0 2px 8px rgba(124, 58, 237, 0.2);
						transition: all 0.2s ease !important;
						cursor: pointer;
					}
					.mango-btn-add-topic:hover {
						background: linear-gradient(135deg, #6d28d9, #5b21b6) !important;
						box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3) !important;
						transform: translateY(-1px);
					}
					.mango-btn-add-topic .dashicons {
						font-size: 16px;
						width: 16px;
						height: 16px;
						color: #fff;
					}

					/* ===== New Topic Form ===== */
					.mango-topic-form-new { margin-bottom: 16px; }
					.mango-topic-form-inner {
						background: #fafbfc;
						border: 1.5px dashed #c4b5fd;
						border-radius: 10px;
						padding: 20px;
					}
					.mango-topic-form-inner h4 {
						margin: 0 0 16px;
						font-size: 14px;
						font-weight: 600;
						color: #334155;
					}

					/* ===== Topic Cards ===== */
					.mango-topic-card {
						background: #fff;
						border: 1px solid #e2e8f0;
						border-radius: 10px;
						margin-bottom: 12px;
						overflow: hidden;
						transition: box-shadow 0.2s ease;
					}
					.mango-topic-card:hover {
						box-shadow: 0 2px 12px rgba(0,0,0,0.05);
					}
					.mango-topic-card-body {
						display: flex;
						align-items: flex-start;
						justify-content: space-between;
						padding: 16px 18px;
						gap: 12px;
					}
					.mango-topic-card-main {
						display: flex;
						align-items: flex-start;
						gap: 14px;
						flex: 1;
						min-width: 0;
					}
					.mango-topic-card-icon {
						width: 44px;
						height: 44px;
						flex-shrink: 0;
						background: #f5f3ff;
						border-radius: 10px;
						display: flex;
						align-items: center;
						justify-content: center;
					}
					.mango-topic-card-icon .dashicons {
						color: #7c3aed;
						font-size: 22px;
						width: 22px;
						height: 22px;
					}
					.mango-topic-card-icon img {
						width: 28px;
						height: 28px;
						border-radius: 6px;
						object-fit: cover;
					}
					.mango-topic-card-info {
						flex: 1;
						min-width: 0;
					}
					.mango-topic-card-name {
						display: block;
						font-size: 14px;
						color: #1e293b;
						margin-bottom: 3px;
					}
					.mango-topic-card-meta {
						display: flex;
						align-items: center;
						gap: 8px;
						font-size: 12px;
						color: #64748b;
					}
					.mango-topic-card-meta code {
						font-size: 11px;
						background: #f1f5f9;
						padding: 1px 6px;
						border-radius: 3px;
						color: #475569;
					}
					.mango-topic-card-count {
						color: #94a3b8;
					}
					.mango-topic-card-desc {
						margin: 6px 0 0;
						font-size: 12.5px;
						color: #64748b;
						line-height: 1.5;
					}
					.mango-topic-card-actions {
						display: flex;
						gap: 6px;
						flex-shrink: 0;
					}
					.mango-topic-card-actions .button {
						padding: 4px 8px !important;
						min-height: 0 !important;
						line-height: 1 !important;
						border: 1px solid #e2e8f0 !important;
						border-radius: 6px !important;
						background: #fff !important;
						color: #64748b !important;
						transition: all 0.15s ease !important;
					}
					.mango-topic-card-actions .button:hover {
						border-color: #c4b5fd !important;
						color: #7c3aed !important;
						background: #f5f3ff !important;
					}
					.mango-topic-card-actions .button .dashicons {
						font-size: 14px;
						width: 14px;
						height: 14px;
					}

					/* ===== Topic Posts ===== */
					.mango-topic-card-posts {
						padding: 0 18px 14px 18px;
						margin-left: 58px;
					}
					.mango-topic-posts-label {
						display: block;
						font-size: 11px;
						font-weight: 600;
						color: #94a3b8;
						text-transform: uppercase;
						letter-spacing: 0.5px;
						margin-bottom: 6px;
					}
					.mango-topic-posts-list {
						display: flex;
						flex-wrap: wrap;
						gap: 6px;
					}
					.mango-topic-post-link {
						display: inline-flex;
						align-items: center;
						gap: 4px;
						padding: 4px 10px;
						background: #f8fafc;
						border: 1px solid #eef2f6;
						border-radius: 6px;
						font-size: 12px;
						color: #475569;
						text-decoration: none;
						transition: all 0.15s ease;
					}
					.mango-topic-post-link:hover {
						background: #f5f3ff;
						border-color: #c4b5fd;
						color: #7c3aed;
					}
					.mango-topic-post-link .dashicons {
						font-size: 12px;
						width: 12px;
						height: 12px;
						color: #94a3b8;
					}
					.mango-topic-post-link:hover .dashicons {
						color: #7c3aed;
					}

					/* ===== Inline Edit ===== */
					.mango-topic-inline-edit {
						border-top: 1px solid #eef2f6;
						padding: 16px 18px;
						background: #fafbfc;
					}
					.mango-topic-inline-fields {
						display: grid;
						grid-template-columns: 1fr 1fr;
						gap: 12px;
						margin-bottom: 12px;
					}
					.mango-topic-inline-fields .mango-field:last-child:nth-child(odd) {
						grid-column: 1 / -1;
					}
					.mango-topic-inline-actions {
						display: flex;
						gap: 8px;
					}
					.mango-topic-inline-actions .button-primary {
						background: linear-gradient(135deg, #7c3aed, #6d28d9) !important;
						border: none !important;
						border-radius: 6px !important;
						padding: 4px 16px !important;
						font-size: 12.5px !important;
						font-weight: 600 !important;
						color: #fff !important;
						box-shadow: 0 2px 6px rgba(124, 58, 237, 0.2) !important;
						transition: all 0.2s ease !important;
					}
					.mango-topic-inline-actions .button-primary:hover {
						box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3) !important;
						transform: translateY(-1px);
					}

					/* ===== Shared Field Styles ===== */
					.mango-field { display: flex; flex-direction: column; gap: 4px; }
					.mango-field label {
						font-size: 12px;
						font-weight: 600;
						color: #475569;
					}
					.mango-input {
						border: 1.5px solid #e2e8f0 !important;
						border-radius: 6px !important;
						padding: 6px 10px !important;
						font-size: 13px !important;
						transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
						box-shadow: none !important;
						width: 100% !important;
					}
					.mango-input:focus {
						border-color: #7c3aed !important;
						box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1) !important;
						outline: none !important;
					}
					.mango-textarea {
						resize: vertical;
						min-height: 40px;
						line-height: 1.5;
					}
					.mango-field-desc {
						margin: 2px 0 0 !important;
						font-size: 11.5px !important;
						color: #94a3b8 !important;
					}
					.mango-field-row {
						display: grid;
						grid-template-columns: 1fr 1fr;
						gap: 12px;
						margin-bottom: 12px;
					}
					.mango-topic-form-actions {
						display: flex;
						gap: 8px;
						margin-top: 16px;
					}
					.mango-topic-form-actions .button-primary {
						background: linear-gradient(135deg, #7c3aed, #6d28d9) !important;
						border: none !important;
						border-radius: 6px !important;
						padding: 6px 20px !important;
						font-size: 13px !important;
						font-weight: 600 !important;
						color: #fff !important;
						box-shadow: 0 2px 6px rgba(124, 58, 237, 0.2) !important;
						transition: all 0.2s ease !important;
					}
					.mango-topic-form-actions .button-primary:hover {
						box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3) !important;
						transform: translateY(-1px);
					}

					/* ===== Empty State ===== */
					.mango-topics-empty {
						text-align: center;
						padding: 48px 20px;
						background: #fafbfc;
						border: 1.5px dashed #e2e8f0;
						border-radius: 10px;
					}
					.mango-topics-empty .dashicons {
						font-size: 40px;
						width: 40px;
						height: 40px;
						color: #c4b5fd;
						margin-bottom: 8px;
					}
					.mango-topics-empty p {
						margin: 0;
						font-size: 14px;
						color: #94a3b8;
					}
					</style>

					<?php elseif ( $tab === 'theme' ): /* === 主题设置选项卡 === */ ?>

					<h2><?php _e( '主题设置', 'mango' ); ?></h2>
					<p class="description"><?php _e( '选择内置风格，或创建自定义配色方案。', 'mango' ); ?></p>

					<?php
					$schemes = get_option( 'mango_color_schemes', [] );

					$presets = [
						'anime' => [
							'label'  => __( 'Anime 紫蓝霓虹', 'mango' ),
							'colors' => [ '#9b6cff', '#4da3ff', '' ],
							'desc'   => __( '紫色与蓝色的霓虹氛围', 'mango' ),
						],
						'black' => [
							'label'  => __( '黑色简约', 'mango' ),
							'colors' => [ '#4a9e6b', '#6bc47f', '' ],
							'desc'   => __( '黑绿搭配简约风格', 'mango' ),
						],
					];
					?>

					<!-- 内置预设 -->
					<div class="mango-scheme-section">
						<h3><?php _e( '内置预设', 'mango' ); ?></h3>
						<div class="mango-scheme-grid">
							<?php foreach ( $presets as $pid => $p ): ?>
							<label class="mango-scheme-card <?php echo $style === $pid ? 'selected' : ''; ?>">
								<input type="radio" name="mango_theme_style" value="<?php echo $pid; ?>"
									<?php checked( $style, $pid ); ?>>
								<div class="mango-scheme-preview">
									<span style="background:<?php echo $p['colors'][0]; ?>"></span>
									<span style="background:<?php echo $p['colors'][1]; ?>"></span>
								</div>
								<div class="mango-scheme-info">
									<strong><?php echo $p['label']; ?></strong>
									<span><?php echo $p['desc']; ?></span>
								</div>
								<span class="mango-scheme-badge"><?php _e( '内置', 'mango' ); ?></span>
							</label>
							<?php endforeach; ?>
						</div>
					</div>

					<!-- 自定义方案 -->
					<div class="mango-scheme-section">
						<h3><?php _e( '自定义配色', 'mango' ); ?></h3>

						<?php
						$scheme_color_fields = [
							'bg' => '背景', 'glass' => '卡片背景', 'glass_hover' => '卡片悬停',
							'border' => '边框', 'border_hover' => '边框悬停',
							'accent' => '主题色', 'accent_glow' => '主题色光晕',
							'text' => '正文', 'text_muted' => '次级文字', 'text_dim' => '弱化文字',
						];
						$scheme_defaults = [
							'bg' => '', 'glass' => '', 'glass_hover' => '', 'border' => '', 'border_hover' => '',
							'accent' => '#2dd4bf', 'accent_glow' => '',
							'text' => '', 'text_muted' => '', 'text_dim' => '',
						];
						?>

						<?php if ( empty( $schemes ) ): ?>
							<p class="description" style="margin-bottom:12px"><?php _e( '还没有自定义配色，点击下方按钮添加。', 'mango' ); ?></p>
						<?php else: ?>
							<div class="mango-scheme-grid mango-scheme-grid--custom">
							<?php foreach ( $schemes as $idx => $s ):
								$selected = $style === $s['id'];
							?>
								<div class="mango-scheme-card mango-scheme-card--edit <?php echo $selected ? 'selected' : ''; ?>">
									<label class="mango-scheme-select">
										<input type="radio" name="mango_theme_style" value="<?php echo $s['id']; ?>"
											<?php checked( $style, $s['id'] ); ?>>
										<div class="mango-scheme-preview">
											<span style="background:<?php echo $s['accent'] ?: '#2dd4bf'; ?>"></span>
										</div>
										<div class="mango-scheme-info">
											<strong><?php echo esc_html( $s['name'] ); ?></strong>
											<span><?php printf( __( '主题色 %s', 'mango' ), $s['accent'] ?: '默认' ); ?></span>
										</div>
									</label>

									<!-- 编辑/删除按钮和折叠编辑区 -->
									<div class="mango-scheme-actions">
										<button type="button" class="button mango-toggle-edit"
												data-target="mango-edit-<?php echo $idx; ?>">
											<?php _e( '编辑', 'mango' ); ?>
										</button>
										<button type="button" class="button mango-delete-scheme"
												data-id="<?php echo $s['id']; ?>"
												data-name="<?php echo esc_attr( $s['name'] ); ?>">
											<?php _e( '删除', 'mango' ); ?>
										</button>
									</div>

									<div class="mango-edit-form" id="mango-edit-<?php echo $idx; ?>" style="display:none">
										<input type="hidden" name="mango_edit_scheme[<?php echo $s['id']; ?>]" value="1">
										<p style="margin:0 0 12px">
											<span style="font-size:12px;font-weight:600;color:#3c434a;display:block;margin-bottom:2px"><?php _e( '名称', 'mango' ); ?></span>
											<input type="text" name="mango_edit_name[<?php echo $s['id']; ?>]"
												   value="<?php echo esc_attr( $s['name'] ); ?>" style="width:100%;max-width:320px">
										</p>
										<div class="mango-color-grid">
										<?php foreach ( $scheme_color_fields as $f_key => $f_label ):
											$val = $s[ $f_key ] ?? '';
											$def = $scheme_defaults[ $f_key ] ?? '';
										?>
											<div class="mango-color-cell">
												<span><?php echo $f_label; ?></span>
												<input type="text" name="mango_edit_<?php echo $f_key; ?>[<?php echo $s['id']; ?>]"
													   value="<?php echo esc_attr( $val ); ?>"
													   class="mango-color-picker" data-default-color="<?php echo $def; ?>">
											</div>
										<?php endforeach; ?>
										</div>
									</div>
								</div>
							<?php endforeach; ?>
							</div>
						<?php endif; ?>

						<!-- 添加新方案按钮 + 折叠表单 -->
						<button type="button" class="button button-secondary mango-toggle-edit"
								data-target="mango-add-scheme-form">
							+ <?php _e( '添加新配色', 'mango' ); ?>
						</button>

						<div class="mango-edit-form mango-add-form" id="mango-add-scheme-form" style="display:none;margin-top:16px">
							<h4 style="margin:0 0 12px"><?php _e( '新配色方案', 'mango' ); ?></h4>
							<p style="margin:0 0 12px">
								<span style="font-size:12px;font-weight:600;color:#3c434a;display:block;margin-bottom:2px"><?php _e( '方案名称 *', 'mango' ); ?></span>
								<input type="text" name="mango_new_scheme_name" style="width:100%;max-width:320px"
									   placeholder="<?php _e( '例：我的主题配色', 'mango' ); ?>">
							</p>
							<div class="mango-color-grid">
							<?php foreach ( $scheme_color_fields as $f_key => $f_label ):
								$def = $scheme_defaults[ $f_key ] ?? '';
							?>
								<div class="mango-color-cell">
									<span><?php echo $f_label; ?></span>
									<input type="text" name="mango_new_<?php echo $f_key; ?>"
										   class="mango-color-picker" data-default-color="<?php echo $def; ?>">
								</div>
							<?php endforeach; ?>
							</div>
						</div>
					</div>

					<!-- 卡片圆角 -->
					<div class="mango-scheme-section">
						<h3><?php _e( '卡片圆角', 'mango' ); ?></h3>
						<p class="description"><?php _e( '控制所有玻璃卡片的统一圆角大小。', 'mango' ); ?></p>
						<div class="mango-radius-control">
							<input type="range" id="mango-radius-slider" min="0" max="50" step="1"
								   name="mango_card_radius" value="<?php echo $card_radius; ?>">
							<span class="mango-radius-value"><?php echo $card_radius; ?>px</span>
						</div>
					</div>
					<script>
					jQuery(function($){
						$('#mango-radius-slider').on('input change', function(){
							$(this).next('.mango-radius-value').text($(this).val() + 'px');
						});
					});
					</script>

					<!-- 布局设置 -->
					<div class="mango-scheme-section">
						<h3><?php _e( '布局设置', 'mango' ); ?></h3>
						<table class="form-table">
							<tr>
								<th scope="row"><?php _e( '侧栏位置', 'mango' ); ?></th>
								<td>
									<select name="mango_sidebar_position" style="min-width:160px;">
										<option value="right" <?php selected( $sidebar_position, 'right' ); ?>><?php _e( '右侧', 'mango' ); ?></option>
										<option value="left" <?php selected( $sidebar_position, 'left' ); ?>><?php _e( '左侧', 'mango' ); ?></option>
										<option value="none" <?php selected( $sidebar_position, 'none' ); ?>><?php _e( '无侧栏', 'mango' ); ?></option>
									</select>
								</td>
							</tr>
							<tr>
								<th scope="row"><label for="mango_content_width"><?php _e( '内容区宽度 (px)', 'mango' ); ?></label></th>
								<td>
									<input type="number" id="mango_content_width" name="mango_content_width"
										   value="<?php echo esc_attr( $content_width ); ?>" min="600" max="1400" step="10" style="width:100px;">
									<p class="description"><?php _e( '建议范围 600~1400px，默认 960px。', 'mango' ); ?></p>
								</td>
							</tr>
							<tr>
								<th scope="row"><?php _e( '文章列表布局', 'mango' ); ?></th>
								<td>
									<select name="mango_archive_layout" style="min-width:160px;">
										<option value="grid" <?php selected( $archive_layout, 'grid' ); ?>><?php _e( '网格布局', 'mango' ); ?></option>
										<option value="list" <?php selected( $archive_layout, 'list' ); ?>><?php _e( '列表布局', 'mango' ); ?></option>
									</select>
								</td>
							</tr>
						</table>
					</div>

					<!-- 文章显示设置 -->
					<div class="mango-scheme-section">
						<h3><?php _e( '文章显示设置', 'mango' ); ?></h3>
						<table class="form-table">
							<tr>
								<th scope="row"><label for="mango_excerpt_length"><?php _e( '摘要长度 (字符)', 'mango' ); ?></label></th>
								<td>
									<input type="number" id="mango_excerpt_length" name="mango_excerpt_length"
										   value="<?php echo esc_attr( $excerpt_length ); ?>" min="0" max="500" step="10" style="width:100px;">
									<p class="description"><?php _e( '0 表示不显示摘要。', 'mango' ); ?></p>
								</td>
							</tr>
							<tr>
								<th scope="row"><?php _e( '文章元信息', 'mango' ); ?></th>
								<td>
									<label><input type="checkbox" name="mango_show_author" value="1" <?php checked( $show_author, '1' ); ?>> <?php _e( '显示作者', 'mango' ); ?></label><br>
									<label><input type="checkbox" name="mango_show_date" value="1" <?php checked( $show_date, '1' ); ?>> <?php _e( '显示日期', 'mango' ); ?></label><br>
									<label><input type="checkbox" name="mango_show_categories" value="1" <?php checked( $show_categories, '1' ); ?>> <?php _e( '显示分类', 'mango' ); ?></label>
									<p class="description"><?php _e( '控制文章列表中是否显示作者、日期和分类信息。', 'mango' ); ?></p>
								</td>
							</tr>
						</table>
					</div>

					<p class="submit">
						<button type="submit" name="mango_save" class="button button-primary">
							<?php _e( '保存设置', 'mango' ); ?>
						</button>
					</p>

					<?php elseif ( $tab === 'sidebar' ): /* === 侧边栏管理选项卡 === */ ?>

					<h2><?php _e( '侧边栏管理', 'mango' ); ?></h2>
					<p class="description"><?php _e( '管理左侧栏和右侧栏显示的模块。可以添加、删除和排序，自定义每个模块的标题。', 'mango' ); ?></p>

					<?php
					$widget_types = [
						'profile'     => __( '个人资料', 'mango' ),
						'categories'  => __( '分类列表', 'mango' ),
						'tags'        => __( '标签云', 'mango' ),
						'topics'      => __( '专栏列表', 'mango' ),
						'wiki_tree'   => __( 'Wiki 页面树', 'mango' ),
						'toc'         => __( '文章目录', 'mango' ),
						'about'       => __( '自定义文本', 'mango' ),
						'site_info'   => __( '站点信息', 'mango' ),
						'custom_html' => __( '自定义 HTML', 'mango' ),
					];
					$widget_type_needs_content = [ 'about', 'custom_html' ];
					$widget_type_has_default_title = [ 'profile', 'categories', 'tags', 'topics', 'wiki_tree', 'toc', 'site_info' ];
					$page_types = [
						'home'     => __( '首页', 'mango' ),
						'post'     => __( '文章页', 'mango' ),
						'category' => __( '分类页', 'mango' ),
						'topic'    => __( '专栏详情', 'mango' ),
						'topics'   => __( '专栏列表', 'mango' ),
						'wiki'     => __( 'Wiki 详情', 'mango' ),
						'wiki_list' => __( 'Wiki 列表', 'mango' ),
						'archive'  => __( '归档', 'mango' ),
						'page'     => __( '页面', 'mango' ),
						'search'   => __( '搜索页', 'mango' ),
						'links'    => __( '链接页', 'mango' ),
					];
					?>

					<div id="mango-sidebar-admin">
						<input type="hidden" name="mango_sidebar_widgets" id="mango-sidebar-widgets-input" value=''>
						<div class="mango-sidebar-toolbar">
							<button type="button" class="button mango-btn-add-widget">
								<span class="dashicons dashicons-plus-alt2"></span>
								<?php _e( '添加模块', 'mango' ); ?>
							</button>
						</div>

						<div class="mango-widget-form-new" id="mango-widget-form-new" style="display:none;">
							<div class="mango-widget-form-inner">
								<h4><?php _e( '添加新模块', 'mango' ); ?></h4>
								<div class="mango-widget-fields">
									<div class="mango-field-row">
										<div class="mango-field">
											<label for="mango_new_widget_side"><?php _e( '显示位置', 'mango' ); ?></label>
											<select id="mango_new_widget_side" class="mango-input">
												<option value="left"><?php _e( '左侧栏', 'mango' ); ?></option>
												<option value="right"><?php _e( '右侧栏', 'mango' ); ?></option>
											</select>
										</div>
										<div class="mango-field">
											<label for="mango_new_widget_type"><?php _e( '模块类型', 'mango' ); ?></label>
											<select id="mango_new_widget_type" class="mango-input">
												<?php foreach ( $widget_types as $type => $label ): ?>
													<option value="<?php echo $type; ?>"><?php echo $label; ?></option>
												<?php endforeach; ?>
											</select>
										</div>
									</div>
									<div class="mango-field">
										<label for="mango_new_widget_title"><?php _e( '自定义标题', 'mango' ); ?></label>
										<input type="text" id="mango_new_widget_title" class="mango-input" placeholder="<?php _e( '留空使用默认标题', 'mango' ); ?>">
										<p class="mango-field-desc"><?php _e( '留空则使用模块类型的默认标题。', 'mango' ); ?></p>
									</div>
									<div class="mango-field" id="mango-new-widget-content-field" style="display:none;">
										<label for="mango_new_widget_content"><?php _e( '内容', 'mango' ); ?></label>
										<textarea id="mango_new_widget_content" class="mango-input mango-textarea" rows="4" placeholder="<?php _e( '输入文本或 HTML 内容...', 'mango' ); ?>"></textarea>
									</div>
									<div class="mango-field">
										<label><?php _e( '显示页面', 'mango' ); ?></label>
										<p class="mango-field-desc"><?php _e( '不勾选则所有页面显示', 'mango' ); ?></p>
										<div class="mango-page-checkboxes" id="mango-new-widget-pages">
											<?php foreach ( $page_types as $key => $label ): ?>
											<label class="mango-page-checkbox-label">
												<input type="checkbox" class="mango-page-checkbox" value="<?php echo $key; ?>">
												<?php echo $label; ?>
											</label>
											<?php endforeach; ?>
										</div>
									</div>
								</div>
								<div class="mango-widget-form-actions">
									<button type="button" class="button button-primary mango-btn-save-new-widget"><?php _e( '添加', 'mango' ); ?></button>
									<button type="button" class="button mango-btn-cancel-new-widget"><?php _e( '取消', 'mango' ); ?></button>
								</div>
							</div>
						</div>

						<div class="mango-widgets-group">
							<h3 class="mango-widgets-group-title">
								<span class="dashicons dashicons-align-left"></span>
								<?php _e( '左侧栏', 'mango' ); ?>
							</h3>
							<div id="mango-widgets-left" class="mango-widgets-list" data-side="left"></div>
							<p class="mango-widgets-empty"><?php _e( '暂无模块，点击上方按钮添加。', 'mango' ); ?></p>
						</div>

						<div class="mango-widgets-group">
							<h3 class="mango-widgets-group-title">
								<span class="dashicons dashicons-align-right"></span>
								<?php _e( '右侧栏', 'mango' ); ?>
							</h3>
							<div id="mango-widgets-right" class="mango-widgets-list" data-side="right"></div>
							<p class="mango-widgets-empty"><?php _e( '暂无模块，点击上方按钮添加。', 'mango' ); ?></p>
						</div>
					</div>

					<script>
					jQuery(function($) {
						var widgets = <?php echo json_encode( $sidebar_widgets ); ?>;
						var $input = $('#mango-sidebar-widgets-input');
						var $newForm = $('#mango-widget-form-new');
						var typeLabels = <?php echo json_encode( $widget_types ); ?>;
						var needsContent = <?php echo json_encode( $widget_type_needs_content ); ?>;
						var pageLabels = <?php echo json_encode( $page_types ); ?>;

						function serialize() { $input.val(JSON.stringify(widgets)); }

						function render() {
							$('#mango-widgets-left, #mango-widgets-right').each(function() {
								var side = $(this).data('side');
								var list = widgets.filter(function(w) { return w.side === side; });
								list.sort(function(a, b) { return a.order - b.order; });
								var html = '';
								$.each(list, function(i, w) {
									var label = typeLabels[w.type] || w.type;
									var titleDisplay = w.title || '(' + label + ')';
									html += '<div class="mango-widget-card" data-id="' + w.id + '">';
									html += '<div class="mango-widget-card-body">';
									html += '<div class="mango-widget-card-main">';
									html += '<span class="mango-widget-type-badge">' + label + '</span>';
									html += '<span class="mango-widget-title-display">' + $('<span>').text(titleDisplay).html() + '</span>';
									html += '</div><div class="mango-widget-card-actions">';
									html += '<button type="button" class="button mango-widget-btn-up" title="上移"><span class="dashicons dashicons-arrow-up-alt2"></span></button>';
									html += '<button type="button" class="button mango-widget-btn-down" title="下移"><span class="dashicons dashicons-arrow-down-alt2"></span></button>';
									html += '<button type="button" class="button mango-widget-btn-edit" title="编辑"><span class="dashicons dashicons-edit"></span></button>';
									html += '<button type="button" class="button mango-widget-btn-delete" title="删除"><span class="dashicons dashicons-trash"></span></button>';
									html += '</div></div>';
									html += '<div class="mango-widget-inline-edit" style="display:none;">';
									html += '<div class="mango-widget-inline-fields">';
									html += '<div class="mango-field"><label>显示位置</label><select class="mango-input mango-inline-side">';
									html += '<option value="left"' + (w.side === 'left' ? ' selected' : '') + '>左侧栏</option>';
									html += '<option value="right"' + (w.side === 'right' ? ' selected' : '') + '>右侧栏</option>';
									html += '</select></div>';
									html += '<div class="mango-field"><label>模块类型</label><select class="mango-input mango-inline-type">';
									$.each(typeLabels, function(t, l) { html += '<option value="' + t + '"' + (w.type === t ? ' selected' : '') + '>' + l + '</option>'; });
									html += '</select></div>';
									html += '<div class="mango-field mango-inline-title-field"><label>自定义标题</label>';
									html += '<input type="text" class="mango-input mango-inline-title" value="' + $('<span>').text(w.title || '').html() + '" placeholder="留空使用默认标题">';
									html += '</div>';
									html += '<div class="mango-field mango-inline-content-field"' + ($.inArray(w.type, needsContent) === -1 ? ' style="display:none;"' : '') + '><label>内容</label>';
									html += '<textarea class="mango-input mango-textarea mango-inline-content" rows="3">' + $('<span>').text(w.content || '').html() + '</textarea>';
									html += '</div>';
									html += '<div class="mango-field"><label>显示页面</label><p class="mango-field-desc" style="margin:0 0 6px;font-size:11px;color:#666;">不勾选则所有页面显示</p><div class="mango-page-checkboxes mango-inline-pages" data-widget-id="' + w.id + '">';
									$.each(pageLabels, function(pk, pl) {
										var checked = w.display_on && $.inArray(pk, w.display_on) !== -1 ? ' checked' : '';
										html += '<label class="mango-page-checkbox-label"><input type="checkbox" class="mango-page-checkbox" value="' + pk + '"' + checked + '>' + pl + '</label>';
									});
									html += '</div></div></div>';
									html += '<div class="mango-widget-inline-actions">';
									html += '<button type="button" class="button button-primary mango-btn-save-edit">保存修改</button>';
									html += '<button type="button" class="button mango-btn-cancel-edit">取消</button>';
									html += '</div></div></div>';
								});
								$(this).html(html);
								var $group = $(this).closest('.mango-widgets-group');
								$group.find('.mango-widgets-empty').toggle(list.length === 0);
							});
							serialize();
						}

						$('.mango-btn-add-widget').on('click', function() { $newForm.slideToggle(180); $('.mango-widget-inline-edit:visible').slideUp(180); });
						$('.mango-btn-cancel-new-widget').on('click', function() { $newForm.slideUp(180); $newForm.find('input, textarea').val(''); $('#mango-new-widget-content-field').hide(); });
						$('#mango_new_widget_type').on('change', function() { $('#mango-new-widget-content-field').toggle($.inArray($(this).val(), needsContent) !== -1); });

						$('.mango-btn-save-new-widget').on('click', function() {
							var side = $('#mango_new_widget_side').val(), type = $('#mango_new_widget_type').val();
							var title = $('#mango_new_widget_title').val().trim(), content = $('#mango_new_widget_content').val().trim();
							var sideWidgets = widgets.filter(function(w) { return w.side === side; });
							var maxOrder = 0; $.each(sideWidgets, function(i, w) { if (w.order > maxOrder) maxOrder = w.order; });
							var displayOn = [];
							$('#mango-new-widget-pages .mango-page-checkbox:checked').each(function() { displayOn.push($(this).val()); });
							widgets.push({ id: 'w_' + Date.now(), side: side, type: type, title: title, content: content, order: maxOrder + 1, display_on: displayOn });
							render(); $newForm.slideUp(180); $newForm.find('input, textarea').val(''); $('#mango-new-widget-pages .mango-page-checkbox').prop('checked', false);
						});

						$(document).on('click', '.mango-widget-btn-edit', function() {
							var $card = $(this).closest('.mango-widget-card'), $editForm = $card.find('.mango-widget-inline-edit');
							$('.mango-widget-inline-edit:visible').not($editForm).slideUp(180); $newForm.slideUp(180); $editForm.slideToggle(180);
							var type = $editForm.find('.mango-inline-type').val();
							$editForm.find('.mango-inline-content-field').toggle($.inArray(type, needsContent) !== -1);
						});
						$(document).on('change', '.mango-inline-type', function() {
							var $f = $(this).closest('.mango-widget-inline-edit');
							$f.find('.mango-inline-content-field').toggle($.inArray($(this).val(), needsContent) !== -1);
						});
						$(document).on('click', '.mango-btn-cancel-edit', function() { $(this).closest('.mango-widget-inline-edit').slideUp(180); });
						$(document).on('click', '.mango-btn-save-edit', function() {
							var $card = $(this).closest('.mango-widget-card'), id = $card.data('id'), $f = $card.find('.mango-widget-inline-edit');
							var idx = -1; $.each(widgets, function(i, w) { if (w.id === id) { idx = i; return false; } });
							if (idx === -1) return;
							widgets[idx].side = $f.find('.mango-inline-side').val();
							widgets[idx].type = $f.find('.mango-inline-type').val();
							widgets[idx].title = $f.find('.mango-inline-title').val().trim();
							widgets[idx].content = $f.find('.mango-inline-content').val().trim();
							var displayOn = [];
							$f.find('.mango-inline-pages .mango-page-checkbox:checked').each(function() { displayOn.push($(this).val()); });
							widgets[idx].display_on = displayOn;
							render();
						});
						$(document).on('click', '.mango-widget-btn-delete', function() {
							if (!confirm('确定要删除此模块吗？')) return;
							widgets = $.grep(widgets, function(w) { return w.id !== $(this).closest('.mango-widget-card').data('id'); });
							render();
						});
						$(document).on('click', '.mango-widget-btn-up', function() {
							var $card = $(this).closest('.mango-widget-card'), id = $card.data('id'), prev = $card.prev('.mango-widget-card');
							if (prev.length === 0) return;
							var cur, prv; $.each(widgets, function(i, w) { if (w.id === id) cur = i; if (w.id === prev.data('id')) prv = i; });
							if (cur === undefined || prv === undefined) return;
							var t = widgets[cur].order; widgets[cur].order = widgets[prv].order; widgets[prv].order = t; render();
						});
						$(document).on('click', '.mango-widget-btn-down', function() {
							var $card = $(this).closest('.mango-widget-card'), id = $card.data('id'), next = $card.next('.mango-widget-card');
							if (next.length === 0) return;
							var cur, nxt; $.each(widgets, function(i, w) { if (w.id === id) cur = i; if (w.id === next.data('id')) nxt = i; });
							if (cur === undefined || nxt === undefined) return;
							var t = widgets[cur].order; widgets[cur].order = widgets[nxt].order; widgets[nxt].order = t; render();
						});

						// Delete button fix
						$(document).on('click', '.mango-widget-btn-delete', function() {
							if (!confirm('确定要删除此模块吗？')) return;
							var id = $(this).closest('.mango-widget-card').data('id');
							widgets = $.grep(widgets, function(w) { return w.id !== id; });
							render();
						});

						render();
					});
					</script>

					<style>
					#mango-sidebar-admin { max-width: 820px; }
					.mango-sidebar-toolbar { margin-bottom: 16px; }
					.mango-btn-add-widget {
						display: inline-flex !important; align-items: center; gap: 4px;
						background: linear-gradient(135deg, #7c3aed, #6d28d9) !important;
						color: #fff !important; border: none !important; border-radius: 8px !important;
						padding: 6px 18px !important; font-size: 13px !important; font-weight: 600 !important;
						box-shadow: 0 2px 8px rgba(124, 58, 237, 0.2); cursor: pointer;
					}
					.mango-btn-add-widget:hover {
						background: linear-gradient(135deg, #6d28d9, #5b21b6) !important;
						box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3) !important; transform: translateY(-1px);
					}
					.mango-btn-add-widget .dashicons { font-size: 16px; width: 16px; height: 16px; color: #fff; }
					.mango-widget-form-new { margin-bottom: 16px; }
					.mango-widget-form-inner { background: #fafbfc; border: 1.5px dashed #c4b5fd; border-radius: 10px; padding: 20px; }
					.mango-widget-form-inner h4 { margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #334155; }
					.mango-widget-form-actions { display: flex; gap: 8px; margin-top: 16px; }
					.mango-widget-form-actions .button-primary {
						background: linear-gradient(135deg, #7c3aed, #6d28d9) !important; border: none !important;
						border-radius: 6px !important; padding: 6px 20px !important; font-size: 13px !important;
						font-weight: 600 !important; color: #fff !important;
						box-shadow: 0 2px 6px rgba(124, 58, 237, 0.2) !important;
					}
					.mango-widget-fields .mango-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
					.mango-widget-fields .mango-field { display: flex; flex-direction: column; gap: 4px; }
					.mango-widget-fields .mango-field label { font-size: 12px; font-weight: 600; color: #475569; }
					.mango-widget-fields .mango-input {
						border: 1.5px solid #e2e8f0 !important; border-radius: 6px !important;
						padding: 6px 10px !important; font-size: 13px !important; box-shadow: none !important; width: 100% !important;
					}
					.mango-widget-fields .mango-input:focus { border-color: #7c3aed !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.1) !important; outline: none !important; }
					.mango-widget-fields .mango-field-desc { margin: 2px 0 0 !important; font-size: 11.5px !important; color: #94a3b8 !important; }
					.mango-widgets-group { margin-bottom: 24px; }
					.mango-widgets-group-title { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: #334155; margin: 0 0 12px; padding: 0 0 8px; border-bottom: 2px solid #f1f5f9; }
					.mango-widgets-group-title .dashicons { font-size: 18px; width: 18px; height: 18px; color: #7c3aed; }
					.mango-widgets-list { display: flex; flex-direction: column; gap: 8px; }
					.mango-widget-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
					.mango-widget-card-body { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; gap: 12px; }
					.mango-widget-card-main { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
					.mango-widget-type-badge { display: inline-block; padding: 2px 10px; border-radius: 10px; background: #f5f3ff; color: #7c3aed; font-size: 11px; font-weight: 600; flex-shrink: 0; }
					.mango-widget-title-display { font-size: 13px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
					.mango-widget-card-actions { display: flex; gap: 4px; flex-shrink: 0; }
					.mango-widget-card-actions .button { padding: 4px 6px !important; min-height: 0 !important; line-height: 1 !important; border: 1px solid #e2e8f0 !important; border-radius: 6px !important; background: #fff !important; color: #64748b !important; }
					.mango-widget-card-actions .button:hover { border-color: #c4b5fd !important; color: #7c3aed !important; background: #f5f3ff !important; }
					.mango-widget-card-actions .button .dashicons { font-size: 14px; width: 14px; height: 14px; }
					.mango-widget-inline-edit { border-top: 1px solid #eef2f6; padding: 14px 16px; background: #fafbfc; }
					.mango-widget-inline-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
					.mango-widget-inline-fields .mango-field { display: flex; flex-direction: column; gap: 3px; }
					.mango-widget-inline-fields .mango-field label { font-size: 11.5px; font-weight: 600; color: #475569; }
					.mango-widget-inline-fields .mango-inline-title-field, .mango-widget-inline-fields .mango-inline-content-field { grid-column: 1 / -1; }
					.mango-widget-inline-fields .mango-input { border: 1.5px solid #e2e8f0 !important; border-radius: 6px !important; padding: 5px 8px !important; font-size: 12.5px !important; box-shadow: none !important; width: 100% !important; }
					.mango-widget-inline-fields .mango-input:focus { border-color: #7c3aed !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.1) !important; outline: none !important; }
					.mango-widget-inline-actions { display: flex; gap: 8px; }
					.mango-widget-inline-actions .button-primary {
						background: linear-gradient(135deg, #7c3aed, #6d28d9) !important; border: none !important;
						border-radius: 6px !important; padding: 4px 16px !important; font-size: 12.5px !important;
						font-weight: 600 !important; color: #fff !important; box-shadow: 0 2px 6px rgba(124,58,237,0.2) !important;
					}
					.mango-widgets-empty { text-align: center; padding: 24px 16px; background: #fafbfc; border: 1.5px dashed #e2e8f0; border-radius: 8px; font-size: 13px; color: #94a3b8; margin: 0; }
					.mango-widget-inline-fields .mango-field:has(.mango-inline-pages) { grid-column: 1 / -1; }
					.mango-page-checkboxes { display: flex; flex-wrap: wrap; gap: 6px; }
					.mango-page-checkbox-label { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #475569; cursor: pointer; padding: 2px 8px; background: #fff; border: 1px solid #e2e8f0; border-radius: 4px; transition: all 0.15s; }
					.mango-page-checkbox-label:hover { border-color: #c4b5fd; background: #f5f3ff; }
					.mango-page-checkbox-label input[type="checkbox"] { margin: 0; accent-color: #7c3aed; }
					</style>

					<p class="submit">
						<button type="submit" name="mango_save" class="button button-primary">
							<?php _e( '保存设置', 'mango' ); ?>
						</button>
					</p>

					<?php elseif ( $tab === 'wiki' ): /* === Wiki 管理选项卡 === */ ?>

					<h2><?php _e( 'Wiki 管理', 'mango' ); ?></h2>
					<p class="description"><?php _e( '管理 Wiki 知识库项目。每个项目包含一个页面树，用于展示项目文档或个人知识库。', 'mango' ); ?></p>

					<?php
					$wiki_data = get_option( 'mango_wiki', [] );
					?>
					<script>var mangoWikiData = <?php echo json_encode( $wiki_data ); ?>;</script>

					<div id="mango-wiki-admin">
						<!-- 工具栏 -->
						<div class="mango-wiki-toolbar">
							<button type="button" class="button mango-btn-add-project">
								<span class="dashicons dashicons-plus-alt2"></span>
								<?php _e( '新建 Wiki 项目', 'mango' ); ?>
							</button>
						</div>

						<!-- 新建项目表单 -->
						<div class="mango-wiki-project-form-new" id="mango-wiki-project-form-new" style="display:none;">
							<div class="mango-wiki-form-inner">
								<h4><?php _e( '新建 Wiki 项目', 'mango' ); ?></h4>
								<div class="mango-wiki-fields">
									<div class="mango-field-row">
										<div class="mango-field">
											<label for="mango_new_wiki_slug"><?php _e( '项目 ID', 'mango' ); ?></label>
											<input type="text" id="mango_new_wiki_slug" class="mango-input" placeholder="stellar">
											<p class="mango-field-desc"><?php _e( '唯一标识，只能包含小写字母、数字、连字符。', 'mango' ); ?></p>
										</div>
										<div class="mango-field">
											<label for="mango_new_wiki_name"><?php _e( '短名称', 'mango' ); ?></label>
											<input type="text" id="mango_new_wiki_name" class="mango-input" placeholder="Stellar">
											<p class="mango-field-desc"><?php _e( '用于导航显示。', 'mango' ); ?></p>
										</div>
									</div>
									<div class="mango-field-row">
										<div class="mango-field">
											<label for="mango_new_wiki_title"><?php _e( '完整标题', 'mango' ); ?></label>
											<input type="text" id="mango_new_wiki_title" class="mango-input" placeholder="Stellar 主题文档">
										</div>
										<div class="mango-field">
											<label for="mango_new_wiki_subtitle"><?php _e( '副标题', 'mango' ); ?></label>
											<input type="text" id="mango_new_wiki_subtitle" class="mango-input" placeholder="每个人的独立博客">
										</div>
									</div>
									<div class="mango-field">
										<label for="mango_new_wiki_icon"><?php _e( '图标 URL', 'mango' ); ?></label>
										<input type="url" id="mango_new_wiki_icon" class="mango-input" placeholder="https://example.com/icon.png">
									</div>
								</div>
								<div class="mango-wiki-form-actions">
									<button type="button" class="button button-primary mango-btn-save-new-project"><?php _e( '保存', 'mango' ); ?></button>
									<button type="button" class="button mango-btn-cancel-new-project"><?php _e( '取消', 'mango' ); ?></button>
								</div>
							</div>
						</div>

						<!-- 项目列表 -->
						<div id="mango-wiki-projects">
							<?php if ( empty( $wiki_data ) ): ?>
								<div class="mango-wiki-empty">
									<span class="dashicons dashicons-book-alt"></span>
									<p><?php _e( '暂无 Wiki 项目，点击上方按钮添加。', 'mango' ); ?></p>
								</div>
							<?php else: ?>
								<?php foreach ( $wiki_data as $slug => $project ):
									$pages = $project['pages'] ?? [];
								?>
									<div class="mango-wiki-project-card" data-slug="<?php echo esc_attr( $slug ); ?>">
										<div class="mango-wiki-project-header">
											<div class="mango-wiki-project-info">
												<div class="mango-wiki-project-icon">
													<?php if ( ! empty( $project['icon'] ) ): ?>
														<img src="<?php echo esc_url( $project['icon'] ); ?>" alt="">
													<?php else: ?>
														<span class="dashicons dashicons-book-alt"></span>
													<?php endif; ?>
												</div>
												<div class="mango-wiki-project-meta">
													<strong class="mango-wiki-project-title"><?php echo esc_html( $project['title'] ?? $project['name'] ?? $slug ); ?></strong>
													<span class="mango-wiki-project-subtitle"><?php echo esc_html( $project['subtitle'] ?? '' ); ?></span>
													<span class="mango-wiki-project-id">
														<code><?php echo esc_html( $slug ); ?></code>
														<span class="mango-wiki-page-count"><?php echo count( $pages ); ?> 页</span>
													</span>
												</div>
											</div>
											<div class="mango-wiki-project-actions">
												<button type="button" class="button mango-wiki-btn-edit-project" title="<?php _e( '编辑项目', 'mango' ); ?>">
													<span class="dashicons dashicons-edit"></span>
												</button>
												<button type="button" class="button mango-wiki-btn-add-page" title="<?php _e( '添加页面', 'mango' ); ?>">
													<span class="dashicons dashicons-plus-alt2"></span>
												</button>
												<button type="button" class="button mango-wiki-btn-delete-project" data-slug="<?php echo esc_attr( $slug ); ?>" title="<?php _e( '删除项目', 'mango' ); ?>">
													<span class="dashicons dashicons-trash"></span>
												</button>
											</div>
										</div>

										<!-- 项目编辑表单（折叠） -->
										<div class="mango-wiki-project-edit-form" style="display:none;">
											<div class="mango-wiki-inline-fields">
												<div class="mango-field">
													<label><?php _e( '短名称', 'mango' ); ?></label>
													<input type="text" class="mango-input mango-project-inline-name" value="<?php echo esc_attr( $project['name'] ?? '' ); ?>">
												</div>
												<div class="mango-field">
													<label><?php _e( '完整标题', 'mango' ); ?></label>
													<input type="text" class="mango-input mango-project-inline-title" value="<?php echo esc_attr( $project['title'] ?? '' ); ?>">
												</div>
												<div class="mango-field">
													<label><?php _e( '副标题', 'mango' ); ?></label>
													<input type="text" class="mango-input mango-project-inline-subtitle" value="<?php echo esc_attr( $project['subtitle'] ?? '' ); ?>">
												</div>
												<div class="mango-field">
													<label><?php _e( '图标 URL', 'mango' ); ?></label>
													<input type="url" class="mango-input mango-project-inline-icon" value="<?php echo esc_attr( $project['icon'] ?? '' ); ?>">
												</div>
											</div>
											<div class="mango-wiki-inline-actions">
												<button type="button" class="button button-primary mango-btn-save-project-edit" data-slug="<?php echo esc_attr( $slug ); ?>"><?php _e( '保存修改', 'mango' ); ?></button>
												<button type="button" class="button mango-btn-cancel-project-edit"><?php _e( '取消', 'mango' ); ?></button>
											</div>
										</div>

										<!-- 页面添加表单（折叠） -->
										<div class="mango-wiki-page-add-form" style="display:none;" data-project="<?php echo esc_attr( $slug ); ?>">
											<div class="mango-wiki-page-add-inner">
												<h4><?php _e( '添加页面', 'mango' ); ?></h4>
												<div class="mango-wiki-inline-fields">
													<div class="mango-field-row">
														<div class="mango-field">
															<label><?php _e( '页面 ID', 'mango' ); ?></label>
															<input type="text" class="mango-input mango-page-new-id" placeholder="getting-started">
															<p class="mango-field-desc"><?php _e( '唯一标识，用于 URL。', 'mango' ); ?></p>
														</div>
														<div class="mango-field">
															<label><?php _e( '标题', 'mango' ); ?></label>
															<input type="text" class="mango-input mango-page-new-title" placeholder="快速开始">
														</div>
													</div>
													<div class="mango-field-row">
														<div class="mango-field">
															<label><?php _e( '父页面', 'mango' ); ?></label>
															<select class="mango-input mango-page-new-parent">
																<option value=""><?php _e( '（顶级页面）', 'mango' ); ?></option>
																<?php foreach ( $pages as $p ): ?>
																	<option value="<?php echo esc_attr( $p['id'] ); ?>"><?php echo esc_html( $p['title'] ); ?></option>
																<?php endforeach; ?>
															</select>
														</div>
														<div class="mango-field">
															<label><?php _e( '排序', 'mango' ); ?></label>
															<input type="number" class="mango-input mango-page-new-order" value="<?php echo count( $pages ) + 1; ?>" min="1" step="1">
														</div>
													</div>
													<div class="mango-field">
														<label><?php _e( '内容 (Markdown)', 'mango' ); ?></label>
														<textarea class="mango-input mango-textarea mango-page-new-content" rows="6" placeholder="# 页面标题&#10;&#10;内容..."></textarea>
													</div>
												</div>
												<div class="mango-wiki-inline-actions">
													<button type="button" class="button button-primary mango-btn-save-new-page" data-project="<?php echo esc_attr( $slug ); ?>"><?php _e( '添加', 'mango' ); ?></button>
													<button type="button" class="button mango-btn-cancel-new-page"><?php _e( '取消', 'mango' ); ?></button>
												</div>
											</div>
										</div>

										<!-- 页面列表 -->
										<?php if ( ! empty( $pages ) ): ?>
											<div class="mango-wiki-pages-list">
												<span class="mango-wiki-pages-label"><?php _e( '页面', 'mango' ); ?></span>
												<?php foreach ( $pages as $idx => $page ): ?>
													<div class="mango-wiki-page-item" data-id="<?php echo esc_attr( $page['id'] ); ?>" data-project="<?php echo esc_attr( $slug ); ?>">
														<div class="mango-wiki-page-row">
															<div class="mango-wiki-page-drag">
																<span class="dashicons dashicons-menu"></span>
															</div>
															<div class="mango-wiki-page-info">
																<span class="mango-wiki-page-title">
																	<?php if ( ! empty( $page['parent'] ) ): ?>
																		<span class="mango-wiki-page-indent dashicons dashicons-arrow-right-alt2"></span>
																	<?php endif; ?>
																	<?php echo esc_html( $page['title'] ); ?>
																</span>
																<code class="mango-wiki-page-slug"><?php echo esc_html( $page['id'] ); ?></code>
																<?php if ( ! empty( $page['parent'] ) ): ?>
																	<span class="mango-wiki-page-parent-badge"><?php echo esc_html( $page['parent'] ); ?></span>
																<?php endif; ?>
															</div>
															<div class="mango-wiki-page-actions">
																<button type="button" class="button mango-wiki-btn-edit-page" title="<?php _e( '编辑', 'mango' ); ?>">
																	<span class="dashicons dashicons-edit"></span>
																</button>
																<button type="button" class="button mango-wiki-btn-delete-page" data-id="<?php echo esc_attr( $page['id'] ); ?>" data-project="<?php echo esc_attr( $slug ); ?>" title="<?php _e( '删除', 'mango' ); ?>">
																	<span class="dashicons dashicons-trash"></span>
																</button>
															</div>
														</div>
														<!-- 页面内联编辑 -->
														<div class="mango-wiki-page-edit-form" style="display:none;">
															<div class="mango-wiki-inline-fields">
																<div class="mango-field-row">
																	<div class="mango-field">
																		<label><?php _e( '页面 ID', 'mango' ); ?></label>
																		<input type="text" class="mango-input mango-page-edit-id" value="<?php echo esc_attr( $page['id'] ); ?>">
																	</div>
																	<div class="mango-field">
																		<label><?php _e( '标题', 'mango' ); ?></label>
																		<input type="text" class="mango-input mango-page-edit-title" value="<?php echo esc_attr( $page['title'] ); ?>">
																	</div>
																</div>
																<div class="mango-field-row">
																	<div class="mango-field">
																		<label><?php _e( '父页面', 'mango' ); ?></label>
																		<select class="mango-input mango-page-edit-parent">
																			<option value=""><?php _e( '（顶级页面）', 'mango' ); ?></option>
																			<?php foreach ( $pages as $p2 ):
																				$sel = $page['parent'] === $p2['id'] ? 'selected' : '';
																			?>
																				<option value="<?php echo esc_attr( $p2['id'] ); ?>" <?php echo $sel; ?>><?php echo esc_html( $p2['title'] ); ?></option>
																			<?php endforeach; ?>
																		</select>
																	</div>
																	<div class="mango-field">
																		<label><?php _e( '排序', 'mango' ); ?></label>
																		<input type="number" class="mango-input mango-page-edit-order" value="<?php echo esc_attr( $page['order'] ?? $idx + 1 ); ?>" min="1" step="1">
																	</div>
																</div>
																<div class="mango-field">
																	<label><?php _e( '内容 (Markdown)', 'mango' ); ?></label>
																	<textarea class="mango-input mango-textarea mango-page-edit-content" rows="6"><?php echo esc_textarea( $page['content'] ?? '' ); ?></textarea>
																</div>
															</div>
															<div class="mango-wiki-inline-actions">
																<button type="button" class="button button-primary mango-btn-save-page-edit" data-project="<?php echo esc_attr( $slug ); ?>"><?php _e( '保存修改', 'mango' ); ?></button>
																<button type="button" class="button mango-btn-cancel-page-edit"><?php _e( '取消', 'mango' ); ?></button>
															</div>
														</div>
													</div>
												<?php endforeach; ?>
											</div>
										<?php endif; ?>
									</div>
								<?php endforeach; ?>
							<?php endif; ?>
						</div>
					</div>

					<script>
					jQuery(function($) {
						var wikiData = typeof mangoWikiData !== 'undefined' ? mangoWikiData : {};
						var $newProjectForm = $('#mango-wiki-project-form-new');

						// ---- 新建项目 ----
						$('.mango-btn-add-project').on('click', function() {
							$newProjectForm.slideToggle(180);
							$('.mango-wiki-project-edit-form:visible').slideUp(180);
							$('.mango-wiki-page-add-form:visible').slideUp(180);
							$('.mango-wiki-page-edit-form:visible').slideUp(180);
						});
						$('.mango-btn-cancel-new-project').on('click', function() {
							$newProjectForm.slideUp(180);
							$newProjectForm.find('input').val('');
						});

						// 保存新建项目
						$('.mango-btn-save-new-project').on('click', function() {
							var slug = $('#mango_new_wiki_slug').val().trim();
							var name = $('#mango_new_wiki_name').val().trim();
							if (!slug) { alert('请输入项目 ID'); return; }
							if (!/^[a-z0-9-]+$/.test(slug)) { alert('项目 ID 只能包含小写字母、数字、连字符'); return; }
							if (!name) { alert('请输入短名称'); return; }
							if (wikiData[slug] && !confirm('项目 "' + slug + '" 已存在，是否覆盖？')) return;

							wikiData[slug] = {
								name: name,
								title: $('#mango_new_wiki_title').val().trim() || name,
								subtitle: $('#mango_new_wiki_subtitle').val().trim(),
								icon: $('#mango_new_wiki_icon').val().trim(),
								pages: [],
							};

							var btn = $(this).prop('disabled', true).text('保存中...');
							$.ajax({
								url: '<?php echo rest_url( 'mango/v1/wiki/save' ); ?>',
								method: 'POST',
								data: JSON.stringify({ slug: slug, project: wikiData[slug] }),
								contentType: 'application/json',
								beforeSend: function(xhr) {
									xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce( 'wp_rest' ); ?>');
								},
								success: function() { location.reload(); },
								error: function() { alert('保存失败，请重试'); btn.prop('disabled', false).text('保存'); }
							});
						});

						// ---- 编辑项目 ----
						$(document).on('click', '.mango-wiki-btn-edit-project', function() {
							var $card = $(this).closest('.mango-wiki-project-card');
							var $editForm = $card.find('.mango-wiki-project-edit-form');
							var isVisible = $editForm.is(':visible');
							$('.mango-wiki-project-edit-form:visible').slideUp(180);
							$('.mango-wiki-page-add-form:visible').slideUp(180);
							$('.mango-wiki-page-edit-form:visible').slideUp(180);
							if (!isVisible) { $editForm.slideDown(180); }
						});

						$(document).on('click', '.mango-btn-cancel-project-edit', function() {
							$(this).closest('.mango-wiki-project-edit-form').slideUp(180);
						});

						$(document).on('click', '.mango-btn-save-project-edit', function() {
							var $btn = $(this);
							var slug = $btn.data('slug');
							var $form = $btn.closest('.mango-wiki-project-edit-form');
							if (!wikiData[slug]) { alert('项目不存在'); return; }

							wikiData[slug].name = $form.find('.mango-project-inline-name').val().trim();
							wikiData[slug].title = $form.find('.mango-project-inline-title').val().trim() || wikiData[slug].name;
							wikiData[slug].subtitle = $form.find('.mango-project-inline-subtitle').val().trim();
							wikiData[slug].icon = $form.find('.mango-project-inline-icon').val().trim();

							$btn.prop('disabled', true).text('保存中...');
							$.ajax({
								url: '<?php echo rest_url( 'mango/v1/wiki/save' ); ?>',
								method: 'POST',
								data: JSON.stringify({ slug: slug, project: wikiData[slug] }),
								contentType: 'application/json',
								beforeSend: function(xhr) {
									xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce( 'wp_rest' ); ?>');
								},
								success: function() { location.reload(); },
								error: function() { alert('保存失败'); $btn.prop('disabled', false).text('保存修改'); }
							});
						});

						// ---- 删除项目 ----
						$(document).on('click', '.mango-wiki-btn-delete-project', function() {
							var slug = $(this).data('slug');
							if (!confirm('确定要删除 Wiki 项目 "' + slug + '" 吗？此操作不可撤销。')) return;
							delete wikiData[slug];
							var $btn = $(this).prop('disabled', true);
							$.ajax({
								url: '<?php echo rest_url( 'mango/v1/wiki/save' ); ?>',
								method: 'POST',
								data: JSON.stringify(wikiData),
								contentType: 'application/json',
								beforeSend: function(xhr) {
									xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce( 'wp_rest' ); ?>');
								},
								success: function() { location.reload(); },
								error: function() { alert('删除失败'); $btn.prop('disabled', false); }
							});
						});

						// ---- 添加页面 ----
						$(document).on('click', '.mango-wiki-btn-add-page', function() {
							var $card = $(this).closest('.mango-wiki-project-card');
							var $addForm = $card.find('.mango-wiki-page-add-form');
							var isVisible = $addForm.is(':visible');
							$('.mango-wiki-page-add-form:visible').slideUp(180);
							$('.mango-wiki-page-edit-form:visible').slideUp(180);
							if (!isVisible) { $addForm.slideDown(180); }
						});

						$(document).on('click', '.mango-btn-cancel-new-page', function() {
							$(this).closest('.mango-wiki-page-add-form').slideUp(180);
						});

						$(document).on('click', '.mango-btn-save-new-page', function() {
							var $btn = $(this);
							var projectSlug = $btn.data('project');
							var $form = $btn.closest('.mango-wiki-page-add-form');
							var pid = $form.find('.mango-page-new-id').val().trim();
							var title = $form.find('.mango-page-new-title').val().trim();
							if (!pid) { alert('请输入页面 ID'); return; }
							if (!/^[a-z0-9-]+$/.test(pid)) { alert('页面 ID 只能包含小写字母、数字、连字符'); return; }
							if (!title) { alert('请输入标题'); return; }
							if (!wikiData[projectSlug]) { alert('项目不存在'); return; }

							// 检查是否已存在
							var exists = false;
							$.each(wikiData[projectSlug].pages, function(i, p) {
								if (p.id === pid) { exists = true; return false; }
							});
							if (exists) { alert('页面 ID "' + pid + '" 已存在'); return; }

							wikiData[projectSlug].pages.push({
								id: pid,
								title: title,
								content: $form.find('.mango-page-new-content').val(),
								parent: $form.find('.mango-page-new-parent').val(),
								order: parseInt($form.find('.mango-page-new-order').val()) || 99,
							});

							$btn.prop('disabled', true).text('保存中...');
							$.ajax({
								url: '<?php echo rest_url( 'mango/v1/wiki/save' ); ?>',
								method: 'POST',
								data: JSON.stringify({ slug: projectSlug, project: wikiData[projectSlug] }),
								contentType: 'application/json',
								beforeSend: function(xhr) {
									xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce( 'wp_rest' ); ?>');
								},
								success: function() { location.reload(); },
								error: function() { alert('保存失败'); $btn.prop('disabled', false).text('添加'); }
							});
						});

						// ---- 编辑页面 ----
						$(document).on('click', '.mango-wiki-btn-edit-page', function() {
							var $pageItem = $(this).closest('.mango-wiki-page-item');
							var $editForm = $pageItem.find('.mango-wiki-page-edit-form');
							var isVisible = $editForm.is(':visible');
							$('.mango-wiki-page-edit-form:visible').slideUp(180);
							$('.mango-wiki-page-add-form:visible').slideUp(180);
							if (!isVisible) { $editForm.slideDown(180); }
						});

						$(document).on('click', '.mango-btn-cancel-page-edit', function() {
							$(this).closest('.mango-wiki-page-edit-form').slideUp(180);
						});

						$(document).on('click', '.mango-btn-save-page-edit', function() {
							var $btn = $(this);
							var projectSlug = $btn.data('project');
							var $pageItem = $btn.closest('.mango-wiki-page-item');
							var oldId = $pageItem.data('id');
							var $editForm = $pageItem.find('.mango-wiki-page-edit-form');
							var newId = $editForm.find('.mango-page-edit-id').val().trim();
							var title = $editForm.find('.mango-page-edit-title').val().trim();
							if (!newId) { alert('请输入页面 ID'); return; }
							if (!title) { alert('请输入标题'); return; }
							if (!wikiData[projectSlug]) { alert('项目不存在'); return; }

							// 更新页面数据
							var pages = wikiData[projectSlug].pages;
							for (var i = 0; i < pages.length; i++) {
								if (pages[i].id === oldId) {
									pages[i].id = newId;
									pages[i].title = title;
									pages[i].content = $editForm.find('.mango-page-edit-content').val();
									pages[i].parent = $editForm.find('.mango-page-edit-parent').val();
									pages[i].order = parseInt($editForm.find('.mango-page-edit-order').val()) || 99;
									break;
								}
								// 更新子页面的 parent 引用
								if (pages[i].parent === oldId && oldId !== newId) {
									pages[i].parent = newId;
								}
							}

							$btn.prop('disabled', true).text('保存中...');
							$.ajax({
								url: '<?php echo rest_url( 'mango/v1/wiki/save' ); ?>',
								method: 'POST',
								data: JSON.stringify({ slug: projectSlug, project: wikiData[projectSlug] }),
								contentType: 'application/json',
								beforeSend: function(xhr) {
									xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce( 'wp_rest' ); ?>');
								},
								success: function() { location.reload(); },
								error: function() { alert('保存失败'); $btn.prop('disabled', false).text('保存修改'); }
							});
						});

						// ---- 删除页面 ----
						$(document).on('click', '.mango-wiki-btn-delete-page', function() {
							var $btn = $(this);
							var projectSlug = $btn.data('project');
							var pageId = $btn.data('id');
							if (!confirm('确定要删除页面 "' + pageId + '" 吗？')) return;
							if (!wikiData[projectSlug]) return;

							wikiData[projectSlug].pages = $.grep(wikiData[projectSlug].pages, function(p) {
								return p.id !== pageId;
							});

							$btn.prop('disabled', true);
							$.ajax({
								url: '<?php echo rest_url( 'mango/v1/wiki/save' ); ?>',
								method: 'POST',
								data: JSON.stringify({ slug: projectSlug, project: wikiData[projectSlug] }),
								contentType: 'application/json',
								beforeSend: function(xhr) {
									xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce( 'wp_rest' ); ?>');
								},
								success: function() { location.reload(); },
								error: function() { alert('删除失败'); $btn.prop('disabled', false); }
							});
						});

					});
					</script>

					<style>
					#mango-wiki-admin { max-width: 820px; }
					.mango-wiki-toolbar { margin-bottom: 16px; }
					.mango-btn-add-project {
						display: inline-flex !important; align-items: center; gap: 4px;
						background: linear-gradient(135deg, #059669, #10b981) !important;
						color: #fff !important; border: none !important; border-radius: 8px !important;
						padding: 6px 18px !important; font-size: 13px !important; font-weight: 600 !important;
						box-shadow: 0 2px 8px rgba(5, 150, 105, 0.2); cursor: pointer;
					}
					.mango-btn-add-project:hover {
						background: linear-gradient(135deg, #047857, #059669) !important;
						box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3) !important; transform: translateY(-1px);
					}
					.mango-btn-add-project .dashicons { font-size: 16px; width: 16px; height: 16px; color: #fff; }
					.mango-wiki-project-form-new { margin-bottom: 16px; }
					.mango-wiki-form-inner { background: #fafbfc; border: 1.5px dashed #6ee7b7; border-radius: 10px; padding: 20px; }
					.mango-wiki-form-inner h4 { margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #334155; }
					.mango-wiki-form-actions { display: flex; gap: 8px; margin-top: 16px; }
					.mango-wiki-form-actions .button-primary {
						background: linear-gradient(135deg, #059669, #10b981) !important; border: none !important;
						border-radius: 6px !important; padding: 6px 20px !important; font-size: 13px !important;
						font-weight: 600 !important; color: #fff !important;
						box-shadow: 0 2px 6px rgba(5, 150, 105, 0.2) !important;
					}
					.mango-wiki-project-card {
						background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
						margin-bottom: 14px; overflow: hidden;
						transition: box-shadow 0.2s ease;
					}
					.mango-wiki-project-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.05); }
					.mango-wiki-project-header {
						display: flex; align-items: flex-start; justify-content: space-between;
						padding: 16px 18px; gap: 12px;
					}
					.mango-wiki-project-info { display: flex; gap: 14px; flex: 1; min-width: 0; }
					.mango-wiki-project-icon {
						width: 44px; height: 44px; flex-shrink: 0;
						background: #ecfdf5; border-radius: 10px;
						display: flex; align-items: center; justify-content: center;
					}
					.mango-wiki-project-icon .dashicons { color: #059669; font-size: 22px; width: 22px; height: 22px; }
					.mango-wiki-project-icon img { width: 28px; height: 28px; border-radius: 6px; object-fit: cover; }
					.mango-wiki-project-meta { flex: 1; min-width: 0; }
					.mango-wiki-project-title { display: block; font-size: 14px; color: #1e293b; margin-bottom: 2px; }
					.mango-wiki-project-subtitle { display: block; font-size: 12px; color: #64748b; margin-bottom: 4px; }
					.mango-wiki-project-id { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #94a3b8; }
					.mango-wiki-project-id code { font-size: 11px; background: #f1f5f9; padding: 1px 6px; border-radius: 3px; color: #475569; }
					.mango-wiki-page-count { color: #94a3b8; }
					.mango-wiki-project-actions { display: flex; gap: 6px; flex-shrink: 0; }
					.mango-wiki-project-actions .button {
						padding: 4px 8px !important; min-height: 0 !important; line-height: 1 !important;
						border: 1px solid #e2e8f0 !important; border-radius: 6px !important;
						background: #fff !important; color: #64748b !important;
					}
					.mango-wiki-project-actions .button:hover { border-color: #6ee7b7 !important; color: #059669 !important; background: #ecfdf5 !important; }
					.mango-wiki-project-actions .button .dashicons { font-size: 14px; width: 14px; height: 14px; }
					.mango-wiki-project-edit-form { border-top: 1px solid #eef2f6; padding: 14px 18px; background: #fafbfc; }
					.mango-wiki-page-add-form { border-top: 1px solid #eef2f6; padding: 14px 18px; background: #fafbfc; }
					.mango-wiki-page-add-inner h4 { margin: 0 0 14px; font-size: 13px; font-weight: 600; color: #334155; }
					.mango-wiki-inline-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
					.mango-wiki-inline-fields > .mango-field:last-child:nth-child(odd),
					.mango-wiki-inline-fields > .mango-field:only-child { grid-column: 1 / -1; }
					.mango-wiki-inline-fields .mango-field { display: flex; flex-direction: column; gap: 3px; }
					.mango-wiki-inline-fields .mango-field label { font-size: 11.5px; font-weight: 600; color: #475569; }
					.mango-wiki-inline-fields .mango-input { border: 1.5px solid #e2e8f0 !important; border-radius: 6px !important; padding: 5px 8px !important; font-size: 12.5px !important; box-shadow: none !important; width: 100% !important; }
					.mango-wiki-inline-fields .mango-input:focus { border-color: #059669 !important; box-shadow: 0 0 0 3px rgba(5,150,105,0.1) !important; outline: none !important; }
					.mango-wiki-inline-actions { display: flex; gap: 8px; }
					.mango-wiki-inline-actions .button-primary {
						background: linear-gradient(135deg, #059669, #10b981) !important; border: none !important;
						border-radius: 6px !important; padding: 4px 16px !important; font-size: 12.5px !important;
						font-weight: 600 !important; color: #fff !important; box-shadow: 0 2px 6px rgba(5,150,105,0.2) !important;
					}
					.mango-wiki-inline-actions .button-primary:hover {
						box-shadow: 0 4px 12px rgba(5,150,105,0.3) !important; transform: translateY(-1px);
					}
					.mango-wiki-pages-list { padding: 0 18px 14px; margin-top: 2px; }
					.mango-wiki-pages-label { display: block; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
					.mango-wiki-page-item {
						background: #f8fafc; border: 1px solid #eef2f6; border-radius: 6px;
						margin-bottom: 6px; overflow: hidden;
					}
					.mango-wiki-page-item:hover { border-color: #d1fae5; }
					.mango-wiki-page-row {
						display: flex; align-items: center; gap: 8px;
						padding: 8px 10px;
					}
					.mango-wiki-page-drag { color: #cbd5e1; cursor: grab; flex-shrink: 0; }
					.mango-wiki-page-drag .dashicons { font-size: 14px; width: 14px; height: 14px; }
					.mango-wiki-page-info { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; }
					.mango-wiki-page-title { font-size: 13px; color: #1e293b; font-weight: 500; display: flex; align-items: center; gap: 2px; }
					.mango-wiki-page-indent { color: #94a3b8; font-size: 12px; width: 12px; height: 12px; }
					.mango-wiki-page-slug { font-size: 11px; background: #f1f5f9; padding: 1px 6px; border-radius: 3px; color: #64748b; }
					.mango-wiki-page-parent-badge { font-size: 10px; background: #d1fae5; color: #059669; padding: 1px 6px; border-radius: 3px; font-weight: 600; }
					.mango-wiki-page-actions { display: flex; gap: 4px; flex-shrink: 0; }
					.mango-wiki-page-actions .button { padding: 2px 6px !important; min-height: 0 !important; line-height: 1 !important; border: 1px solid #e2e8f0 !important; border-radius: 4px !important; background: #fff !important; color: #64748b !important; }
					.mango-wiki-page-actions .button:hover { border-color: #6ee7b7 !important; color: #059669 !important; background: #ecfdf5 !important; }
					.mango-wiki-page-actions .button .dashicons { font-size: 12px; width: 12px; height: 12px; }
					.mango-wiki-page-edit-form { border-top: 1px solid #eef2f6; padding: 12px 14px; background: #fafbfc; }
					.mango-wiki-empty { text-align: center; padding: 48px 20px; background: #fafbfc; border: 1.5px dashed #e2e8f0; border-radius: 10px; }
					.mango-wiki-empty .dashicons { font-size: 40px; width: 40px; height: 40px; color: #6ee7b7; margin-bottom: 8px; }
					.mango-wiki-empty p { margin: 0; font-size: 14px; color: #94a3b8; }
					</style>

					<p class="submit">
						<button type="submit" name="mango_save" class="button button-primary">
							<?php _e( '保存设置', 'mango' ); ?>
						</button>
					</p>

					<?php else: /* === 高级设置选项卡 === */ ?>

					<h2><?php _e( '高级设置', 'mango' ); ?></h2>
					<p class="description"><?php _e( '配置社交链接、统计代码、自定义代码和 SEO 设置。', 'mango' ); ?></p>

					<!-- 社交链接 -->
					<div class="mango-scheme-section">
						<h3><?php _e( '社交链接', 'mango' ); ?></h3>
						<p class="description"><?php _e( '填写你的社交账号链接，将在前端展示。', 'mango' ); ?></p>
						<table class="form-table">
							<tr>
								<th scope="row"><label for="mango_social_github">GitHub</label></th>
								<td>
									<input type="url" id="mango_social_github" name="mango_social_links[github]"
										   value="<?php echo esc_attr( $social_links['github'] ?? '' ); ?>" class="regular-text"
										   placeholder="https://github.com/username">
								</td>
							</tr>
							<tr>
								<th scope="row"><label for="mango_social_twitter">Twitter / X</label></th>
								<td>
									<input type="url" id="mango_social_twitter" name="mango_social_links[twitter]"
										   value="<?php echo esc_attr( $social_links['twitter'] ?? '' ); ?>" class="regular-text"
										   placeholder="https://twitter.com/username">
								</td>
							</tr>
							<tr>
								<th scope="row"><label for="mango_social_bilibili">Bilibili</label></th>
								<td>
									<input type="url" id="mango_social_bilibili" name="mango_social_links[bilibili]"
										   value="<?php echo esc_attr( $social_links['bilibili'] ?? '' ); ?>" class="regular-text"
										   placeholder="https://space.bilibili.com/uid">
								</td>
							</tr>
							<tr>
								<th scope="row"><label for="mango_social_weibo">微博</label></th>
								<td>
									<input type="url" id="mango_social_weibo" name="mango_social_links[weibo]"
										   value="<?php echo esc_attr( $social_links['weibo'] ?? '' ); ?>" class="regular-text"
										   placeholder="https://weibo.com/username">
								</td>
							</tr>
							<tr>
								<th scope="row"><label for="mango_social_email">Email</label></th>
								<td>
									<input type="email" id="mango_social_email" name="mango_social_links[email]"
										   value="<?php echo esc_attr( $social_links['email'] ?? '' ); ?>" class="regular-text"
										   placeholder="hello@example.com">
								</td>
							</tr>
						</table>
					</div>

					<!-- 统计/跟踪代码 -->
					<div class="mango-scheme-section">
						<h3><?php _e( '统计 / Tracking 代码', 'mango' ); ?></h3>
						<p class="description"><?php _e( '在页面头部和底部注入第三方统计代码（如 Google Analytics、百度统计等）。直接粘贴完整的 script 标签。', 'mango' ); ?></p>
						<table class="form-table">
							<tr>
								<th scope="row"><label for="mango_header_code"><?php _e( '头部代码', 'mango' ); ?></label></th>
								<td>
									<textarea id="mango_header_code" name="mango_header_code" class="large-text" rows="6"
											  placeholder="&lt;script async src=&quot;https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX&quot;&gt;&lt;/script&gt;<?php _e( "\n// ...", 'mango' ); ?>"><?php echo esc_textarea( $header_code ); ?></textarea>
									<p class="description"><?php _e( '插入到 &lt;/head&gt; 之前。适用于 Google Analytics、百度统计等。', 'mango' ); ?></p>
								</td>
							</tr>
							<tr>
								<th scope="row"><label for="mango_footer_code"><?php _e( '底部代码', 'mango' ); ?></label></th>
								<td>
									<textarea id="mango_footer_code" name="mango_footer_code" class="large-text" rows="6"
											  placeholder="&lt;script&gt;console.log('hello');&lt;/script&gt;"><?php echo esc_textarea( $footer_code ); ?></textarea>
									<p class="description"><?php _e( '插入到 &lt;/body&gt; 之前。', 'mango' ); ?></p>
								</td>
							</tr>
						</table>
					</div>

					<!-- 自定义 CSS/JS -->
					<div class="mango-scheme-section">
						<h3><?php _e( '自定义 CSS / JS', 'mango' ); ?></h3>
						<p class="description"><?php _e( '直接编写自定义样式和脚本，无需修改主题文件。', 'mango' ); ?></p>
						<table class="form-table">
							<tr>
								<th scope="row"><label for="mango_custom_css"><?php _e( '自定义 CSS', 'mango' ); ?></label></th>
								<td>
									<textarea id="mango_custom_css" name="mango_custom_css" class="large-text code" rows="8"
											  placeholder="body { background: #f0f0f0; }"><?php echo esc_textarea( $custom_css ); ?></textarea>
								</td>
							</tr>
							<tr>
								<th scope="row"><label for="mango_custom_js"><?php _e( '自定义 JS', 'mango' ); ?></label></th>
								<td>
									<textarea id="mango_custom_js" name="mango_custom_js" class="large-text code" rows="8"
											  placeholder="console.log('Mango theme loaded');"><?php echo esc_textarea( $custom_js ); ?></textarea>
									<p class="description"><?php _e( '插入到 &lt;/body&gt; 之前。', 'mango' ); ?></p>
								</td>
							</tr>
						</table>
					</div>

					<!-- SEO 设置 -->
					<div class="mango-scheme-section">
						<h3><?php _e( 'SEO 设置', 'mango' ); ?></h3>
						<p class="description"><?php _e( '配置首页的 SEO 元信息。', 'mango' ); ?></p>
						<table class="form-table">
							<tr>
								<th scope="row"><label for="mango_seo_home_title"><?php _e( '首页标题', 'mango' ); ?></label></th>
								<td>
									<input type="text" id="mango_seo_home_title" name="mango_seo_home_title"
										   value="<?php echo esc_attr( $seo_home_title ); ?>" class="regular-text"
										   placeholder="<?php bloginfo( 'name' ); ?>">
									<p class="description"><?php _e( '覆盖默认的站点标题。留空使用站点名称。', 'mango' ); ?></p>
								</td>
							</tr>
							<tr>
								<th scope="row"><label for="mango_seo_home_description"><?php _e( '首页描述', 'mango' ); ?></label></th>
								<td>
									<textarea id="mango_seo_home_description" name="mango_seo_home_description" class="large-text" rows="3"
											  placeholder="<?php _e( '一个基于 React 的 WordPress 博客主题', 'mango' ); ?>"><?php echo esc_textarea( $seo_home_desc ); ?></textarea>
									<p class="description"><?php _e( 'meta description，用于搜索引擎结果展示。', 'mango' ); ?></p>
								</td>
							</tr>
							<tr>
								<th scope="row"><label for="mango_seo_home_keywords"><?php _e( '首页关键词', 'mango' ); ?></label></th>
								<td>
									<input type="text" id="mango_seo_home_keywords" name="mango_seo_home_keywords"
										   value="<?php echo esc_attr( $seo_home_keywords ); ?>" class="regular-text"
										   placeholder="blog, WordPress, React">
									<p class="description"><?php _e( '用英文逗号分隔。', 'mango' ); ?></p>
								</td>
							</tr>
						</table>
					</div>

					<p class="submit">
						<button type="submit" name="mango_save" class="button button-primary">
							<?php _e( '保存设置', 'mango' ); ?>
						</button>
					</p>

					<?php endif; /* tab */ ?>
				</form>
			</div>
		</div>
	</div>

	<!-- 删除确认 & 编辑折叠 JS -->
	<script>
	jQuery(function($){
		$(".mango-toggle-edit").on("click", function(){
			var target = $("#" + $(this).data("target"));
			target.slideToggle(200);
			target.find(".mango-color-picker").each(function(){
				if (!$(this).hasClass("wp-color-picker")) {
					$(this).wpColorPicker();
				}
			});
		});
		$(".mango-delete-scheme").on("click", function(){
			var btn = $(this);
			var name = btn.data("name");
			if (confirm("<?php _e( '确定删除配色方案"', 'mango' ); ?>" + name + "<?php _e( '"吗？', 'mango' ); ?>")) {
				var form = btn.closest("form");
				$("<input>").attr({type:"hidden", name:"mango_delete_scheme", value:btn.data("id")}).appendTo(form);
				form.find("[name=\"mango_save\"]").trigger("click");
			}
		});
		$(".mango-scheme-card").on("click", function(e){
			if ($(e.target).closest("button, input, .mango-edit-form, .wp-picker-holder").length) return;
			$(this).find("input[type=\"radio\"]").prop("checked", true);
			$(this).closest(".mango-scheme-grid").find(".mango-scheme-card").removeClass("selected");
			$(this).addClass("selected");
		});
	});
	</script>

	<style>
	/* ===== Page Layout ===== */
	.mango-settings-page .mango-page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%);
		margin: -10px -20px 20px -20px;
		padding: 24px 28px;
		border-radius: 0 0 12px 12px;
		box-shadow: 0 4px 20px rgba(124, 58, 237, 0.25);
	}
	.mango-settings-page .mango-header-brand {
		display: flex;
		align-items: center;
		gap: 16px;
	}
	.mango-settings-page .mango-header-logo {
		width: 48px;
		height: 48px;
		background: rgba(255,255,255,0.2);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		backdrop-filter: blur(8px);
	}
	.mango-settings-page .mango-header-logo .dashicons {
		font-size: 28px;
		width: 28px;
		height: 28px;
		color: #fff;
	}
	.mango-settings-page .mango-header-text h1 {
		color: #fff;
		font-size: 22px;
		font-weight: 700;
		margin: 0;
		padding: 0;
		line-height: 1.3;
		text-shadow: 0 1px 3px rgba(0,0,0,0.15);
	}
	.mango-settings-page .mango-header-subtitle {
		color: rgba(255,255,255,0.8);
		font-size: 13px;
		margin: 2px 0 0;
	}
	.mango-settings-page .mango-version-badge {
		display: inline-block;
		padding: 4px 14px;
		background: rgba(255,255,255,0.2);
		color: #fff;
		border-radius: 20px;
		font-size: 12px;
		font-weight: 600;
		backdrop-filter: blur(4px);
		border: 1px solid rgba(255,255,255,0.15);
	}

	/* ===== Settings Wrap ===== */
	.mango-settings-wrap {
		display: flex;
		gap: 24px;
		align-items: flex-start;
	}

	/* ===== Sidebar ===== */
	.mango-settings-sidebar {
		flex-shrink: 0;
		width: 220px;
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0,0,0,0.04);
	}
	.mango-sidebar-tab {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 18px;
		text-decoration: none;
		color: #475569;
		border-bottom: 1px solid #f1f5f9;
		font-size: 13px;
		font-weight: 500;
		transition: all 0.15s ease;
		position: relative;
		border-left: 3px solid transparent;
	}
	.mango-sidebar-tab:last-child {
		border-bottom: none;
	}
	.mango-sidebar-tab .dashicons {
		color: #94a3b8;
		font-size: 18px;
		width: 18px;
		height: 18px;
		transition: color 0.15s ease;
	}
	.mango-sidebar-tab:hover {
		background: #f8fafc;
		color: #7c3aed;
	}
	.mango-sidebar-tab:hover .dashicons {
		color: #7c3aed;
	}
	.mango-sidebar-tab.active {
		background: #f5f3ff;
		color: #7c3aed;
		border-left-color: #7c3aed;
		font-weight: 600;
	}
	.mango-sidebar-tab.active .dashicons {
		color: #7c3aed;
	}

	/* ===== Content ===== */
	.mango-settings-content {
		flex: 1;
		min-width: 0;
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 24px 28px;
		box-shadow: 0 1px 3px rgba(0,0,0,0.04);
	}
	.mango-settings-content h2 {
		font-size: 18px;
		font-weight: 700;
		color: #1e293b;
		margin: 0 0 4px;
		padding: 0;
	}
	.mango-settings-content h2 + p.description {
		margin-top: 0;
		margin-bottom: 20px;
		color: #64748b;
		font-size: 13px;
	}
	.mango-settings-content h3 {
		font-size: 14px;
		font-weight: 600;
		color: #334155;
		margin: 0 0 12px;
		padding: 0 0 8px;
		border-bottom: 2px solid #f1f5f9;
	}

	/* ===== Scheme Sections ===== */
	.mango-scheme-section {
		margin-bottom: 28px;
		padding: 20px;
		background: #fafbfc;
		border: 1px solid #eef2f6;
		border-radius: 8px;
		transition: box-shadow 0.2s ease;
	}
	.mango-scheme-section:hover {
		box-shadow: 0 2px 8px rgba(0,0,0,0.04);
	}
	.mango-scheme-section h3 {
		border: none;
		padding: 0;
		margin: 0 0 12px;
		font-size: 14px;
		font-weight: 600;
		color: #334155;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.mango-scheme-section > p.description {
		margin-top: -4px;
		margin-bottom: 16px;
		color: #64748b;
		font-size: 12.5px;
	}

	/* ===== Form Table ===== */
	.mango-settings-content .form-table {
		margin-top: 0;
	}
	.mango-settings-content .form-table th {
		padding: 12px 12px 12px 0;
		font-size: 13px;
		color: #334155;
		font-weight: 600;
		width: 160px;
	}
	.mango-settings-content .form-table td {
		padding: 10px 0;
	}
	.mango-settings-content .form-table input[type="text"],
	.mango-settings-content .form-table input[type="url"],
	.mango-settings-content .form-table input[type="email"],
	.mango-settings-content .form-table input[type="number"],
	.mango-settings-content .form-table select,
	.mango-settings-content .form-table textarea {
		border: 1.5px solid #e2e8f0;
		border-radius: 6px;
		padding: 6px 10px;
		font-size: 13px;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
	}
	.mango-settings-content .form-table input[type="text"]:focus,
	.mango-settings-content .form-table input[type="url"]:focus,
	.mango-settings-content .form-table input[type="email"]:focus,
	.mango-settings-content .form-table input[type="number"]:focus,
	.mango-settings-content .form-table select:focus,
	.mango-settings-content .form-table textarea:focus {
		border-color: #7c3aed;
		box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
		outline: none;
	}
	.mango-settings-content .form-table select {
		min-height: 32px;
	}
	.mango-settings-content .form-table .description {
		color: #64748b;
		font-size: 12px;
		margin-top: 4px;
	}
	.mango-settings-content .form-table input[type="checkbox"] {
		margin-right: 4px;
	}
	.mango-settings-content .form-table label {
		color: #475569;
		font-size: 13px;
	}

	/* ===== Submit Button ===== */
	.mango-settings-content p.submit {
		margin: 24px 0 0;
		padding: 0;
	}
	.mango-settings-content p.submit .button-primary {
		background: linear-gradient(135deg, #7c3aed, #6d28d9);
		border: none;
		border-radius: 8px;
		padding: 8px 28px;
		font-size: 14px;
		font-weight: 600;
		color: #fff;
		box-shadow: 0 2px 8px rgba(124, 58, 237, 0.25);
		transition: all 0.2s ease;
		cursor: pointer;
	}
	.mango-settings-content p.submit .button-primary:hover {
		background: linear-gradient(135deg, #6d28d9, #5b21b6);
		box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);
		transform: translateY(-1px);
	}
	.mango-settings-content p.submit .button-primary:active {
		transform: translateY(0);
		box-shadow: 0 1px 4px rgba(124, 58, 237, 0.3);
	}

	/* ===== Scheme Cards ===== */
	.mango-scheme-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 12px;
		margin-bottom: 16px;
	}
	.mango-scheme-card {
		display: block;
		border: 1.5px solid #e2e8f0;
		border-radius: 8px;
		padding: 14px;
		cursor: pointer;
		transition: all 0.2s ease;
		background: #fff;
		position: relative;
	}
	.mango-scheme-card:hover {
		border-color: #c4b5fd;
		box-shadow: 0 2px 12px rgba(124, 58, 237, 0.08);
		transform: translateY(-1px);
	}
	.mango-scheme-card.selected {
		border-color: #7c3aed;
		box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15), 0 2px 12px rgba(124, 58, 237, 0.1);
		background: #f5f3ff;
	}
	.mango-scheme-card input[type="radio"] {
		position: absolute;
		opacity: 0;
	}
	.mango-scheme-preview {
		display: flex;
		gap: 6px;
		margin-bottom: 10px;
	}
	.mango-scheme-preview span {
		width: 30px;
		height: 30px;
		border-radius: 6px;
		border: 1px solid rgba(0,0,0,0.06);
	}
	.mango-scheme-info {
		margin-bottom: 4px;
	}
	.mango-scheme-info strong {
		display: block;
		font-size: 13px;
		color: #1e293b;
	}
	.mango-scheme-info span {
		font-size: 11.5px;
		color: #64748b;
	}
	.mango-scheme-badge {
		display: inline-block;
		padding: 2px 10px;
		border-radius: 12px;
		background: linear-gradient(135deg, #7c3aed, #3b82f6);
		color: #fff;
		font-size: 10px;
		font-weight: 600;
		position: absolute;
		top: 10px;
		right: 10px;
	}
	.mango-scheme-card--edit {
		padding-bottom: 8px;
	}
	.mango-scheme-select {
		display: block;
		cursor: pointer;
	}
	.mango-scheme-actions {
		display: flex;
		gap: 6px;
		margin-top: 6px;
	}
	.mango-scheme-actions .button {
		font-size: 11.5px;
		min-height: 0;
		padding: 3px 12px;
		line-height: 1.8;
		border-radius: 4px;
		border: 1px solid #e2e8f0;
		color: #475569;
		background: #fff;
		transition: all 0.15s ease;
	}
	.mango-scheme-actions .button:hover {
		border-color: #c4b5fd;
		color: #7c3aed;
		background: #f5f3ff;
	}

	/* ===== Edit Forms ===== */
	.mango-edit-form {
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 14px;
		margin-top: 10px;
	}
	.mango-edit-form .regular-text {
		width: 100%;
		max-width: 320px;
	}
	.mango-color-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
		gap: 8px;
	}
	.mango-color-cell {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.mango-color-cell span {
		font-size: 11px;
		color: #64748b;
		white-space: nowrap;
	}
	.mango-add-form {
		border-style: dashed;
		background: #fafbfc;
	}

	/* ===== Radius Slider ===== */
	.mango-radius-control {
		display: flex;
		align-items: center;
		gap: 14px;
		max-width: 360px;
		padding: 4px 0;
	}
	.mango-radius-control input[type="range"] {
		flex: 1;
		-webkit-appearance: none;
		appearance: none;
		height: 6px;
		background: #e2e8f0;
		border-radius: 3px;
		outline: none;
	}
	.mango-radius-control input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		background: linear-gradient(135deg, #7c3aed, #6d28d9);
		border-radius: 50%;
		cursor: pointer;
		box-shadow: 0 2px 6px rgba(124, 58, 237, 0.3);
		transition: transform 0.15s ease;
	}
	.mango-radius-control input[type="range"]::-webkit-slider-thumb:hover {
		transform: scale(1.15);
	}
	.mango-radius-control input[type="range"]::-moz-range-thumb {
		width: 20px;
		height: 20px;
		background: linear-gradient(135deg, #7c3aed, #6d28d9);
		border-radius: 50%;
		cursor: pointer;
		border: none;
		box-shadow: 0 2px 6px rgba(124, 58, 237, 0.3);
	}
	.mango-radius-value {
		font-size: 16px;
		font-weight: 700;
		color: #7c3aed;
		min-width: 44px;
		font-variant-numeric: tabular-nums;
	}

	/* ===== Topics ===== */
	#mango-topics-admin {
		max-width: 800px;
	}
	.mango-topic-item {
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 14px 18px;
		margin-bottom: 12px;
		transition: box-shadow 0.2s ease;
	}
	.mango-topic-item:hover {
		box-shadow: 0 2px 8px rgba(0,0,0,0.04);
	}
	.mango-topic-header {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}
	.mango-topic-name {
		font-size: 14px;
		color: #1e293b;
	}
	.mango-topic-id {
		font-size: 12px;
		color: #64748b;
	}
	.mango-topic-id code {
		font-size: 12px;
		background: #f1f5f9;
		padding: 1px 6px;
		border-radius: 3px;
		color: #475569;
	}
	.mango-topic-count {
		font-size: 12px;
		color: #64748b;
		margin-right: auto;
	}
	.mango-topic-posts {
		margin: 8px 0 0;
		padding: 8px 0 0 18px;
		border-top: 1px solid #f1f5f9;
		list-style: disc;
	}
	.mango-topic-posts li {
		margin: 4px 0;
		font-size: 13px;
	}
	.mango-topic-posts a {
		color: #7c3aed;
		text-decoration: none;
	}
	.mango-topic-posts a:hover {
		color: #6d28d9;
		text-decoration: underline;
	}

	/* ===== Code textareas ===== */
	.mango-settings-content .form-table textarea.code {
		font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
		font-size: 12.5px;
		line-height: 1.6;
	}

	/* ===== Responsive ===== */
	@media (max-width: 782px) {
		.mango-settings-page .mango-page-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 12px;
			padding: 20px;
		}
		.mango-settings-wrap {
			flex-direction: column;
		}
		.mango-settings-sidebar {
			width: 100%;
			display: flex;
			flex-wrap: wrap;
		}
		.mango-sidebar-tab {
			flex: 1;
			justify-content: center;
			border-bottom: none;
			border-right: 1px solid #f1f5f9;
			border-left: none;
			min-width: 0;
			padding: 12px 8px;
		}
		.mango-sidebar-tab:last-child {
			border-right: none;
		}
		.mango-sidebar-tab.active {
			border-left-color: transparent;
			border-bottom: 3px solid #7c3aed;
		}
		.mango-sidebar-tab .dashicons {
			font-size: 16px;
			width: 16px;
			height: 16px;
		}
		.mango-tab-label {
			font-size: 11px;
		}
		.mango-scheme-grid {
			grid-template-columns: 1fr;
		}
		.mango-settings-content .form-table th {
			width: auto;
			padding-bottom: 4px;
		}
		.mango-scheme-section {
			padding: 14px;
		}
		.mango-settings-content {
			padding: 16px;
		}
	}
	</style>

	<?php
}
