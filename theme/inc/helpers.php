<?php
/**
 * Helper / utility functions
 *
 * @package Mango
 */

/** 获取单个自定义配色方案 */
function mango_get_color_scheme( string $id ): ?array {
	$schemes = get_option( 'mango_color_schemes', [] );
	foreach ( $schemes as $s ) {
		if ( $s['id'] === $id ) {
			return $s;
		}
	}
	return null;
}

/**
 * 将十六进制颜色转为 HSL 数组（Stellar label 格式）
 */
function mango_hex_to_hsl( string $hex ): array {
	$hex = ltrim( $hex, '#' );
	if ( strlen( $hex ) !== 6 ) {
		return [ 'hue' => 0, 'saturation' => 0, 'lightness' => 0 ];
	}
	$r = hexdec( substr( $hex, 0, 2 ) ) / 255;
	$g = hexdec( substr( $hex, 2, 2 ) ) / 255;
	$b = hexdec( substr( $hex, 4, 2 ) ) / 255;

	$max   = max( $r, $g, $b );
	$min   = min( $r, $g, $b );
	$delta = $max - $min;

	$hue        = 0;
	$saturation = 0;
	$lightness  = ( $max + $min ) / 2;

	if ( $delta > 0 ) {
		$saturation = $lightness > 0.5
			? $delta / ( 2 - $max - $min )
			: $delta / ( $max + $min );

		switch ( $max ) {
			case $r:
				$hue = ( ( $g - $b ) / $delta + ( $g < $b ? 6 : 0 ) ) / 6;
				break;
			case $g:
				$hue = ( ( $b - $r ) / $delta + 2 ) / 6;
				break;
			case $b:
				$hue = ( ( $r - $g ) / $delta + 4 ) / 6;
				break;
		}
	}

	return [
		'hue'        => round( $hue * 360 ),
		'saturation' => round( $saturation * 100 ),
		'lightness'  => round( $lightness * 100 ),
	];
}
