<?php
/**
 * Customizer settings, theme style, and inline CSS output
 *
 * @package Mango
 */

/**
 * 注册主题样式切换的 Customizer 设置
 */
function mango_customize_register( WP_Customize_Manager $wp_customize ): void {
	$wp_customize->add_section( 'mango_theme', [
		'title'    => __( 'Mango 主题设置', 'mango' ),
		'priority' => 30,
	] );

	$wp_customize->add_setting( 'mango_theme_style', [
		'default'           => 'anime',
		'sanitize_callback' => 'mango_sanitize_theme_style',
		'transport'         => 'refresh',
		'type'              => 'theme_mod',
	] );

	$wp_customize->add_control( 'mango_theme_style', [
		'section' => 'mango_theme',
		'label'   => __( '主题配色风格', 'mango' ),
		'type'    => 'radio',
		'choices' => [
			'anime' => __( 'Anime 紫蓝霓虹', 'mango' ),
			'black' => __( '黑色简约', 'mango' ),
		],
	] );
}
add_action( 'customize_register', 'mango_customize_register' );

/**
 * 主题风格与自定义方案验证
 */
function mango_sanitize_theme_style( string $value ): string {
	// 内置风格
	if ( in_array( $value, [ 'anime', 'black' ], true ) ) {
		return $value;
	}
	// 自定义方案 ID
	if ( str_starts_with( $value, 'custom_' ) ) {
		return $value;
	}
	return 'anime';
}

/**
 * 根据设置向 body 添加主题 class
 */
function mango_theme_body_class( array $classes ): array {
	$style = get_theme_mod( 'mango_theme_style', 'anime' );
	// 自定义方案使用 anime-theme 作为基础布局
	if ( str_starts_with( $style, 'custom_' ) ) {
		$classes[] = 'anime-theme';
		$classes[] = 'custom-theme';
	} else {
		$classes[] = $style . '-theme';
	}

	// 随机图片兜底开关
	$basic = get_option( 'mango_basic_settings', [] );
	if ( ( $basic['use_random_image'] ?? '1' ) !== '1' ) {
		$classes[] = 'no-random-image-fallback';
	}

	return $classes;
}
add_filter( 'body_class', 'mango_theme_body_class' );

/**
 * 向前端输出自定义配色的 CSS 变量
 */
function mango_output_custom_css(): void {
	$style = get_theme_mod( 'mango_theme_style', 'anime' );

	// 仅对自定义方案（custom_xxx）输出 CSS 变量
	if ( ! str_starts_with( $style, 'custom_' ) ) {
		return;
	}

	$scheme = mango_get_color_scheme( $style );
	if ( ! $scheme ) {
		return;
	}

	// 所有可自定义的 CSS 变量映射
	$css_var_map = [
		'bg'           => '--bg',
		'glass'        => '--glass',
		'glass_hover'  => '--glass-hover',
		'border'       => '--border',
		'border_hover' => '--border-hover',
		'purple'       => '--purple',
		'purple_glow'  => '--purple-glow',
		'blue'         => '--blue',
		'blue_glow'    => '--blue-glow',
		'text'         => '--text',
		'text_muted'   => '--text-muted',
		'text_dim'     => '--text-dim',
	];

	$rules = [];
	foreach ( $css_var_map as $key => $css_var ) {
		if ( ! empty( $scheme[ $key ] ) ) {
			$rules[] = "{$css_var}: {$scheme[$key]};";
		}
	}

	if ( empty( $rules ) ) {
		return;
	}

	echo '<style id="mango-custom-colors">' . "\n";
	echo "body.anime-theme {\n";
	echo '  ' . implode( "\n  ", $rules ) . "\n";
	echo "}\n";
	echo '</style>' . "\n";
}
add_action( 'wp_head', 'mango_output_custom_css', 100 );

/**
 * 向前端输出卡片圆角 CSS 变量
 */
function mango_output_radius_css(): void {
	$radius = get_theme_mod( 'mango_card_radius', 25 );
	$radius = intval( $radius );
	if ( $radius < 0 || $radius > 50 ) {
		$radius = 25;
	}
	echo '<style id="mango-radius">' . "\n";
	echo "body.anime-theme, body.black-theme, body.custom-theme {\n";
	echo "  --radius-sm: {$radius}px;\n";
	echo "  --radius-md: {$radius}px;\n";
	echo "  --radius-lg: {$radius}px;\n";
	echo "}\n";
	echo '</style>' . "\n";
}
add_action( 'wp_head', 'mango_output_radius_css', 99 );

/**
 * 向 body 添加布局相关的 class（侧栏位置）
 */
function mango_theme_layout_body_class( array $classes ): array {
	$layout  = get_theme_mod( 'mango_layout_settings', [] );
	$sidebar = $layout['sidebar_position'] ?? 'right';
	$classes[] = 'sidebar-' . $sidebar;
	return $classes;
}
add_filter( 'body_class', 'mango_theme_layout_body_class' );

/**
 * 向前端输出布局 CSS 变量（内容区宽度）
 */
function mango_output_layout_css(): void {
	$layout       = get_theme_mod( 'mango_layout_settings', [] );
	$content_width = intval( $layout['content_width'] ?? 960 );
	$content_width = max( 600, min( 1400, $content_width ) );
	echo '<style id="mango-layout">' . "\n";
	echo ":root {\n";
	echo "  --content-width: {$content_width}px;\n";
	echo "}\n";
	echo '</style>' . "\n";
}
add_action( 'wp_head', 'mango_output_layout_css', 98 );

/**
 * 输出 SEO meta 标签到头部
 */
function mango_output_seo_meta(): void {
	$seo = get_option( 'mango_seo_settings', [] );
	if ( is_front_page() || is_home() ) {
		$description = $seo['home_description'] ?? '';
		$keywords    = $seo['home_keywords'] ?? '';
		if ( ! empty( $description ) ) {
			echo '<meta name="description" content="' . esc_attr( $description ) . '">' . "\n";
		}
		if ( ! empty( $keywords ) ) {
			echo '<meta name="keywords" content="' . esc_attr( $keywords ) . '">' . "\n";
		}
	}
}
add_action( 'wp_head', 'mango_output_seo_meta', 1 );

/**
 * 输出头部 tracking 代码
 */
function mango_output_header_code(): void {
	$codes = get_option( 'mango_tracking_codes', [] );
	$code  = $codes['header'] ?? '';
	if ( ! empty( trim( $code ) ) ) {
		echo $code . "\n";
	}
}
add_action( 'wp_head', 'mango_output_header_code', 999 );

/**
 * 输出底部 tracking 代码和自定义 JS
 */
function mango_output_footer_code(): void {
	// 统计底部代码
	$codes = get_option( 'mango_tracking_codes', [] );
	$footer_code = $codes['footer'] ?? '';
	if ( ! empty( trim( $footer_code ) ) ) {
		echo $footer_code . "\n";
	}

	// 自定义 JS
	$custom = get_option( 'mango_custom_code', [] );
	$custom_js = $custom['js'] ?? '';
	if ( ! empty( trim( $custom_js ) ) ) {
		echo '<script>' . "\n" . $custom_js . "\n" . '</script>' . "\n";
	}
}
add_action( 'wp_footer', 'mango_output_footer_code', 999 );

/**
 * 输出自定义 CSS
 */
function mango_output_custom_css_front(): void {
	$custom = get_option( 'mango_custom_code', [] );
	$css    = $custom['css'] ?? '';
	if ( ! empty( trim( $css ) ) ) {
		echo '<style id="mango-custom-css">' . "\n" . $css . "\n" . '</style>' . "\n";
	}
}
add_action( 'wp_head', 'mango_output_custom_css_front', 101 );

/**
 * 自定义首页标题
 */
function mango_custom_home_title( string $title ): string {
	if ( ( is_front_page() || is_home() ) && ! is_admin() ) {
		$seo = get_option( 'mango_seo_settings', [] );
		$home_title = $seo['home_title'] ?? '';
		if ( ! empty( $home_title ) ) {
			return $home_title;
		}
	}
	return $title;
}
add_filter( 'pre_get_document_title', 'mango_custom_home_title', 10, 1 );
