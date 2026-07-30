<?php
/**
 * Music module: NetEase Cloud Music playlist integration
 *
 * Provides a REST API proxy to fetch NetEase Cloud Music playlists
 * server-side (avoids CORS issues) and returns a normalized track list.
 *
 * @package Mango
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register music REST routes.
 */
function mango_register_music_routes(): void {
	register_rest_route( 'mango/v1', '/netease/playlist', [
		'methods'             => 'GET',
		'callback'            => 'mango_get_netease_playlist',
		'permission_callback' => '__return_true',
		'args'                => [
			'id' => [
				'required'          => true,
				'validate_callback' => static fn( $param ): bool => is_string( $param ) && preg_match( '/^\d+$/', $param ),
			],
		],
	] );
}
add_action( 'rest_api_init', 'mango_register_music_routes' );

/**
 * Fetch a NetEase Cloud Music playlist and return a normalized track list.
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response|WP_Error
 */
function mango_get_netease_playlist( WP_REST_Request $request ) {
	$playlist_id = sanitize_text_field( $request->get_param( 'id' ) );

	// Cache for 1 hour to avoid repeated external requests
	$cache_key = 'mango_netease_pl_' . $playlist_id;
	$cached    = get_transient( $cache_key );
	if ( false !== $cached ) {
		return new WP_REST_Response( $cached, 200 );
	}

	$api_url = 'https://music.163.com/api/playlist/detail?id=' . $playlist_id;

	$headers = [
		'Referer'    => 'https://music.163.com',
		'User-Agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
		'Cookie'     => 'os=pc; appver=2.10.14; ',
	];

	// 策略1: GET + SSL 验证
	$response = wp_remote_get( $api_url, [
		'timeout' => 15,
		'headers' => $headers,
	] );

	// 策略2: 跳过 SSL 验证
	if ( is_wp_error( $response ) ) {
		$response = wp_remote_get( $api_url, [
			'timeout'    => 15,
			'headers'    => $headers,
			'sslverify'  => false,
		] );
	}

	if ( is_wp_error( $response ) ) {
		return new WP_Error( 'fetch_failed', '无法获取歌单数据', [ 'status' => 502 ] );
	}

	$code = wp_remote_retrieve_response_code( $response );
	if ( $code < 200 || $code >= 300 ) {
		return new WP_Error( 'fetch_failed', '网易云接口返回错误', [ 'status' => 502 ] );
	}

	$body = wp_remote_retrieve_body( $response );
	$data = json_decode( $body, true );

	if ( ! is_array( $data ) || ( $data['code'] ?? 0 ) !== 200 ) {
		return new WP_Error( 'invalid_response', '歌单不存在或无法访问', [ 'status' => 404 ] );
	}

	$playlist   = $data['playlist'] ?? [];
	$tracks_raw = $playlist['tracks'] ?? [];
	$track_ids  = $playlist['trackIds'] ?? [];

	$tracks = [];

	// 优先使用 tracks 数组（包含歌曲名和歌手信息）
	if ( ! empty( $tracks_raw ) && is_array( $tracks_raw ) ) {
		foreach ( $tracks_raw as $track ) {
			$song_id = $track['id'] ?? '';
			if ( empty( $song_id ) ) {
				continue;
			}
			$name    = $track['name'] ?? '未知曲目';
			$artists = [];
			// ar 字段（标准接口）
			if ( isset( $track['ar'] ) && is_array( $track['ar'] ) ) {
				foreach ( $track['ar'] as $ar ) {
					if ( ! empty( $ar['name'] ) ) {
						$artists[] = $ar['name'];
					}
				}
			} elseif ( isset( $track['artists'] ) && is_array( $track['artists'] ) ) {
				// artists 字段（部分接口）
				foreach ( $track['artists'] as $ar ) {
					if ( ! empty( $ar['name'] ) ) {
						$artists[] = $ar['name'];
					}
				}
			}
			$tracks[] = [
				'title'  => $name,
				'artist' => implode( ' / ', $artists ),
				'url'    => 'https://music.163.com/song/media/outer/url?id=' . $song_id . '.mp3',
			];
		}
	} elseif ( ! empty( $track_ids ) && is_array( $track_ids ) ) {
		// 大歌单（>1000 首）可能只有 trackIds，无歌曲名
		foreach ( $track_ids as $item ) {
			$song_id = $item['id'] ?? '';
			if ( empty( $song_id ) ) {
				continue;
			}
			$tracks[] = [
				'title'  => '未知曲目',
				'artist' => '',
				'url'    => 'https://music.163.com/song/media/outer/url?id=' . $song_id . '.mp3',
			];
		}
	}

	if ( empty( $tracks ) ) {
		return new WP_Error( 'empty_playlist', '歌单中没有可播放的歌曲', [ 'status' => 404 ] );
	}

	$result = [
		'name'   => $playlist['name'] ?? '网易云音乐歌单',
		'tracks' => $tracks,
	];

	set_transient( $cache_key, $result, HOUR_IN_SECONDS );

	return new WP_REST_Response( $result, 200 );
}
