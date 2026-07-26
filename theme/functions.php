<?php
/**
 * Mango Theme Functions
 *
 * @package Mango
 */

/**
 * Enqueue scripts and styles for the React SPA.
 */
function mango_enqueue_scripts(): void {
    $theme = wp_get_theme('mango');
    $version = $theme->get('Version');

    // 获取构建清单文件中的入口资源
    $build_dir = get_template_directory() . '/';
    $manifest_path = $build_dir . 'manifest.json';

    if (file_exists($manifest_path)) {
        $manifest = json_decode(file_get_contents($manifest_path), true);

        // 查找 JS 入口文件
        foreach ($manifest as $key => $item) {
            if (isset($item['isEntry']) && $item['isEntry']) {
                // Enqueue CSS
                if (!empty($item['css'])) {
                    foreach ($item['css'] as $css_file) {
                        wp_enqueue_style(
                            'mango-' . sanitize_title(basename($css_file, '.css')),
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
    $mango_basic      = get_option('mango_basic_settings', []);

    // 将 WordPress 数据传递给前端
    wp_localize_script('mango-app', 'MANGO_DATA', [
        'siteUrl'        => site_url(),
        'apiUrl'         => esc_url_raw(rest_url('wp/v2')),
        'themeUri'       => get_template_directory_uri(),
        'nonce'          => wp_create_nonce('wp_rest'),
        'randomImageApi' => esc_url_raw($mango_basic['random_image_api'] ?? ''),
        'useRandomImage' => ($mango_basic['use_random_image'] ?? '1') === '1',
    ]);
}
add_action('wp_enqueue_scripts', 'mango_enqueue_scripts');

/**
 * 启用 WordPress 原生链接管理器（Link Manager）
 * 在后台侧边栏添加「链接」菜单，支持分类和完整 CRUD
 */
add_filter('pre_option_link_manager_enabled', '__return_true');

/**
 * 添加主题支持特性
 */
function mango_theme_setup(): void {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', [
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
    ]);

    register_nav_menus([
        'primary' => __('Primary Menu', 'mango'),
    ]);
}
add_action('after_setup_theme', 'mango_theme_setup');

/**
 * 为 Mango 主脚本添加 type="module" 属性
 * Vite 8 生产构建产出的 ESM 格式需要 type="module" 加载
 */
function mango_add_module_type(string $tag, string $handle, string $src): string {
    if ($handle === 'mango-app') {
        $tag = '<script type="module" src="' . esc_url($src) . '" id="mango-app-js"></script>';
    }
    return $tag;
}
add_filter('script_loader_tag', 'mango_add_module_type', 10, 3);

/**
 * 移除不必要的 WordPress 头部输出（SPA 不需要）
 */
remove_action('wp_head', 'wp_generator');
remove_action('wp_head', 'wlwmanifest_link');
remove_action('wp_head', 'rsd_link');
remove_action('wp_head', 'feed_links', 2);
remove_action('wp_head', 'feed_links_extra', 3);

/**
 * 注册主题样式切换的 Customizer 设置
 */
function mango_customize_register(WP_Customize_Manager $wp_customize): void {
    $wp_customize->add_section('mango_theme', [
        'title'    => __('Mango 主题设置', 'mango'),
        'priority' => 30,
    ]);

    $wp_customize->add_setting('mango_theme_style', [
        'default'           => 'anime',
        'sanitize_callback' => 'mango_sanitize_theme_style',
        'transport'         => 'refresh',
        'type'              => 'theme_mod',
    ]);

    $wp_customize->add_control('mango_theme_style', [
        'section'  => 'mango_theme',
        'label'    => __('主题配色风格', 'mango'),
        'type'     => 'radio',
        'choices'  => [
            'anime' => __('Anime 紫蓝霓虹', 'mango'),
            'black' => __('黑色简约', 'mango'),
        ],
    ]);
}
add_action('customize_register', 'mango_customize_register');

/**
 * 主题风格与自定义方案验证
 */
function mango_sanitize_theme_style(string $value): string {
    // 内置风格
    if (in_array($value, ['anime', 'black'], true)) {
        return $value;
    }
    // 自定义方案 ID
    if (str_starts_with($value, 'custom_')) {
        return $value;
    }
    return 'anime';
}

/**
 * 根据设置向 body 添加主题 class
 */
function mango_theme_body_class(array $classes): array {
    $style = get_theme_mod('mango_theme_style', 'anime');
    // 自定义方案使用 anime-theme 作为基础布局
    if (str_starts_with($style, 'custom_')) {
        $classes[] = 'anime-theme';
        $classes[] = 'custom-theme';
    } else {
        $classes[] = $style . '-theme';
    }

    // 随机图片兜底开关
    $basic = get_option('mango_basic_settings', []);
    if (($basic['use_random_image'] ?? '1') !== '1') {
        $classes[] = 'no-random-image-fallback';
    }

    return $classes;
}
add_filter('body_class', 'mango_theme_body_class');

/** 获取单个自定义配色方案 */
function mango_get_color_scheme(string $id): ?array {
    $schemes = get_option('mango_color_schemes', []);
    foreach ($schemes as $s) {
        if ($s['id'] === $id) return $s;
    }
    return null;
}

/* =====================================================
 * Mango 主题后台设置页面
 * ===================================================== */

/**
 * 在后台侧边栏添加 Mango 主题设置菜单
 */
function mango_add_admin_menu(): void {
    add_theme_page(
        __('Mango 主题设置', 'mango'),
        __('Mango 主题设置', 'mango'),
        'manage_options',
        'mango-settings',
        'mango_render_admin_page'
    );
}
add_action('admin_menu', 'mango_add_admin_menu');

/**
 * 加载管理页面所需的资源（颜色选择器）
 */
function mango_admin_enqueue_assets(string $hook): void {
    if ($hook !== 'appearance_page_mango-settings') {
        return;
    }
    wp_enqueue_style('wp-color-picker');
    wp_enqueue_script('wp-color-picker');
    wp_add_inline_script('wp-color-picker', '
        jQuery(function($){
            $(".mango-color-picker").wpColorPicker();
        });
    ');
}
add_action('admin_enqueue_scripts', 'mango_admin_enqueue_assets');

/**
 * 渲染设置页面（双标签）
 */
function mango_render_admin_page(): void {
    if (!current_user_can('manage_options')) {
        return;
    }

    // 基本设置
    if (isset($_POST['mango_save'])) {
        check_admin_referer('mango_settings_action', 'mango_settings_nonce');

        // 基本设置（仅在基本设置字段存在时保存，避免被主题设置保存覆盖）
        if (isset($_POST['mango_site_logo'])) {
            $basic = [
                'site_logo'        => esc_url_raw($_POST['mango_site_logo'] ?? ''),
                'avatar_url'       => esc_url_raw($_POST['mango_avatar_url'] ?? ''),
                'footer_text'      => sanitize_text_field($_POST['mango_footer_text'] ?? ''),
                'random_image_api' => esc_url_raw($_POST['mango_random_image_api'] ?? ''),
                'use_random_image' => isset($_POST['mango_use_random_image']) ? '1' : '0',
            ];
            update_option('mango_basic_settings', $basic);
        }

        // 处理自定义配色方案
        $schemes = get_option('mango_color_schemes', []);
        $changed = false;

        // 删除方案
        if (!empty($_POST['mango_delete_scheme'])) {
            $delete_id = sanitize_text_field($_POST['mango_delete_scheme']);
            $schemes = array_values(array_filter($schemes, function ($s) use ($delete_id) {
                return $s['id'] !== $delete_id;
            }));
            $changed = true;
        }

        // 添加新方案
        if (!empty($_POST['mango_new_scheme_name'])) {
            $new_scheme = [
                'id'   => 'custom_' . uniqid(),
                'name' => sanitize_text_field($_POST['mango_new_scheme_name']),
            ];
            $color_keys = ['bg','glass','glass_hover','border','border_hover','purple','purple_glow','blue','blue_glow','text','text_muted','text_dim'];
            foreach ($color_keys as $k) {
                $new_scheme[$k] = sanitize_hex_color($_POST['mango_new_' . $k] ?? '');
            }
            $schemes[] = $new_scheme;
            $changed = true;
        }

        // 更新已有方案
        if (!empty($_POST['mango_edit_scheme'])) {
            $edit_ids = $_POST['mango_edit_scheme'];
            foreach ($schemes as &$s) {
                if (isset($edit_ids[$s['id']])) {
                    $color_keys = ['bg','glass','glass_hover','border','border_hover','purple','purple_glow','blue','blue_glow','text','text_muted','text_dim'];
                    foreach ($color_keys as $k) {
                        $s[$k] = sanitize_hex_color($_POST['mango_color_' . $s['id'] . '_' . $k] ?? '');
                    }
                }
            }
            unset($s);
            $changed = true;
        }

        // 保存方案
        if ($changed) {
            update_option('mango_color_schemes', $schemes);
        }

        // 应用主题方案
        if (!empty($_POST['mango_theme_style'])) {
            set_theme_mod('mango_theme_style', sanitize_text_field($_POST['mango_theme_style']));
        }

        // 保存卡片圆角
        if (isset($_POST['mango_card_radius'])) {
            $radius = intval($_POST['mango_card_radius']);
            $radius = max(0, min(50, $radius));
            set_theme_mod('mango_card_radius', $radius);
        }

        echo '<div class="notice notice-success is-dismissible"><p>' . __('设置已保存。', 'mango') . '</p></div>';
    }

    // 读取当前值
    $style       = get_theme_mod('mango_theme_style', 'anime');
    $card_radius = get_theme_mod('mango_card_radius', 25);
    $basic            = get_option('mango_basic_settings', []);
    $site_logo        = $basic['site_logo'] ?? '';
    $avatar_url       = $basic['avatar_url'] ?? '';
    $footer_text      = $basic['footer_text'] ?? '';
    $random_image_api = $basic['random_image_api'] ?? '';
    $use_random_image = $basic['use_random_image'] ?? '1';

    // 读取自定义配色方案
    $schemes = get_option('mango_color_schemes', []);
    $tab = $_GET['tab'] ?? 'basic';
    ?>

    <div class="wrap">
        <h1><?php _e('Mango 主题设置', 'mango'); ?></h1>

        <div class="mango-settings-wrap">
            <!-- 侧边选项卡导航 -->
            <div class="mango-settings-sidebar">
                <a href="?page=mango-settings&tab=basic"
                   class="mango-sidebar-tab <?php echo $tab === 'basic' ? 'active' : ''; ?>">
                    <span class="dashicons dashicons-admin-generic"></span>
                    <?php _e('基本设置', 'mango'); ?>
                </a>
                <a href="?page=mango-settings&tab=theme"
                   class="mango-sidebar-tab <?php echo $tab === 'theme' ? 'active' : ''; ?>">
                    <span class="dashicons dashicons-art"></span>
                    <?php _e('主题设置', 'mango'); ?>
                </a>
            </div>

            <!-- 内容区 -->
            <div class="mango-settings-content">
                <form method="post" action="">
                    <?php wp_nonce_field('mango_settings_action', 'mango_settings_nonce'); ?>

                    <?php if ($tab === 'basic'): ?>

                    <h2><?php _e('基本设置', 'mango'); ?></h2>
                    <p class="description"><?php _e('配置网站的基本信息。', 'mango'); ?></p>

                    <table class="form-table">
                        <tr>
                            <th scope="row"><label for="mango_site_logo"><?php _e('站点 Logo URL', 'mango'); ?></label></th>
                            <td>
                                <input type="url" id="mango_site_logo" name="mango_site_logo"
                                       value="<?php echo esc_attr($site_logo); ?>" class="regular-text"
                                       placeholder="https://example.com/logo.png">
                                <p class="description"><?php _e('网站 Logo 图片地址，留空使用文字 Logo。', 'mango'); ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><label for="mango_avatar_url"><?php _e('头像 URL', 'mango'); ?></label></th>
                            <td>
                                <input type="url" id="mango_avatar_url" name="mango_avatar_url"
                                       value="<?php echo esc_attr($avatar_url); ?>" class="regular-text"
                                       placeholder="https://example.com/avatar.jpg">
                                <p class="description"><?php _e('侧栏头像图片地址，留空使用 Gravatar。', 'mango'); ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><label for="mango_random_image_api"><?php _e('随机图片 API', 'mango'); ?></label></th>
                            <td>
                                <input type="url" id="mango_random_image_api" name="mango_random_image_api"
                                       value="<?php echo esc_attr($random_image_api); ?>" class="regular-text"
                                       placeholder="https://uapis.cn/api/v1/random/image">
                                <p class="description"><?php _e('文章无特色图片时使用的随机图片 API 地址。留空使用默认值。', 'mango'); ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><?php _e('随机图片兜底', 'mango'); ?></th>
                            <td>
                                <label>
                                    <input type="checkbox" id="mango_use_random_image" name="mango_use_random_image" value="1" <?php checked($use_random_image, '1'); ?>>
                                    <?php _e('文章无特色图片时使用随机图片作为缩略图', 'mango'); ?>
                                </label>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><label for="mango_footer_text"><?php _e('页脚文字', 'mango'); ?></label></th>
                            <td>
                                <input type="text" id="mango_footer_text" name="mango_footer_text"
                                       value="<?php echo esc_attr($footer_text); ?>" class="regular-text"
                                       placeholder="<?php _e('© 2026 Mango Theme', 'mango'); ?>">
                            </td>
                        </tr>
                    </table>

                    <p class="submit">
                        <button type="submit" name="mango_save" class="button button-primary">
                            <?php _e('保存设置', 'mango'); ?>
                        </button>
                    </p>

                    <?php else: /* === 主题设置选项卡 === */ ?>

                    <h2><?php _e('主题设置', 'mango'); ?></h2>
                    <p class="description"><?php _e('选择内置风格，或创建自定义配色方案。', 'mango'); ?></p>

                    <?php
                    $schemes = get_option('mango_color_schemes', []);

                    $presets = [
                        'anime' => [
                            'label' => __('Anime 紫蓝霓虹', 'mango'),
                            'colors' => ['#9b6cff', '#4da3ff', ''],
                            'desc' => __('紫色与蓝色的霓虹氛围', 'mango'),
                        ],
                        'black' => [
                            'label' => __('黑色简约', 'mango'),
                            'colors' => ['#4a9e6b', '#6bc47f', ''],
                            'desc' => __('黑绿搭配简约风格', 'mango'),
                        ],
                    ];
                    ?>

                    <!-- 内置预设 -->
                    <div class="mango-scheme-section">
                        <h3><?php _e('内置预设', 'mango'); ?></h3>
                        <div class="mango-scheme-grid">
                            <?php foreach ($presets as $pid => $p): ?>
                            <label class="mango-scheme-card <?php echo $style === $pid ? 'selected' : ''; ?>">
                                <input type="radio" name="mango_theme_style" value="<?php echo $pid; ?>"
                                    <?php checked($style, $pid); ?>>
                                <div class="mango-scheme-preview">
                                    <span style="background:<?php echo $p['colors'][0]; ?>"></span>
                                    <span style="background:<?php echo $p['colors'][1]; ?>"></span>
                                </div>
                                <div class="mango-scheme-info">
                                    <strong><?php echo $p['label']; ?></strong>
                                    <span><?php echo $p['desc']; ?></span>
                                </div>
                                <span class="mango-scheme-badge"><?php _e('内置', 'mango'); ?></span>
                            </label>
                            <?php endforeach; ?>
                        </div>
                    </div>

                    <!-- 自定义方案 -->
                    <div class="mango-scheme-section">
                        <h3><?php _e('自定义配色', 'mango'); ?></h3>

                        <?php
$scheme_color_fields = [
    'bg' => '背景', 'glass' => '卡片背景', 'glass_hover' => '卡片悬停',
    'border' => '边框', 'border_hover' => '边框悬停',
    'purple' => '主色', 'purple_glow' => '主色光晕',
    'blue' => '强调色', 'blue_glow' => '强调色光晕',
    'text' => '正文', 'text_muted' => '次级文字', 'text_dim' => '弱化文字',
];
$scheme_defaults = [
    'bg' => '', 'glass' => '', 'glass_hover' => '', 'border' => '', 'border_hover' => '',
    'purple' => '#9b6cff', 'purple_glow' => '', 'blue' => '#4da3ff', 'blue_glow' => '',
    'text' => '', 'text_muted' => '', 'text_dim' => '',
];
?>

<?php if (empty($schemes)): ?>
                            <p class="description" style="margin-bottom:12px"><?php _e('还没有自定义配色，点击下方按钮添加。', 'mango'); ?></p>
                        <?php else: ?>
                            <div class="mango-scheme-grid mango-scheme-grid--custom">
                            <?php foreach ($schemes as $idx => $s):
                                $selected = $style === $s['id'];
                            ?>
                                <div class="mango-scheme-card mango-scheme-card--edit <?php echo $selected ? 'selected' : ''; ?>">
                                    <label class="mango-scheme-select">
                                        <input type="radio" name="mango_theme_style" value="<?php echo $s['id']; ?>"
                                            <?php checked($style, $s['id']); ?>>
                                        <div class="mango-scheme-preview">
                                            <span style="background:<?php echo $s['purple'] ?: '#9b6cff'; ?>"></span>
                                            <span style="background:<?php echo $s['blue'] ?: '#4da3ff'; ?>"></span>
                                        </div>
                                        <div class="mango-scheme-info">
                                            <strong><?php echo esc_html($s['name']); ?></strong>
                                            <span><?php printf(__('主色 %s · 强调色 %s', 'mango'), $s['purple'] ?: '默认', $s['blue'] ?: '默认'); ?></span>
                                        </div>
                                    </label>

                                    <!-- 编辑/删除按钮和折叠编辑区 -->
                                    <div class="mango-scheme-actions">
                                        <button type="button" class="button mango-toggle-edit"
                                                data-target="mango-edit-<?php echo $idx; ?>">
                                            <?php _e('编辑', 'mango'); ?>
                                        </button>
                                        <button type="button" class="button mango-delete-scheme"
                                                data-id="<?php echo $s['id']; ?>"
                                                data-name="<?php echo esc_attr($s['name']); ?>">
                                            <?php _e('删除', 'mango'); ?>
                                        </button>
                                    </div>

                                    <div class="mango-edit-form" id="mango-edit-<?php echo $idx; ?>" style="display:none">
                                        <input type="hidden" name="mango_edit_scheme[<?php echo $s['id']; ?>]" value="1">
                                        <p style="margin:0 0 12px">
                                            <span style="font-size:12px;font-weight:600;color:#3c434a;display:block;margin-bottom:2px"><?php _e('名称', 'mango'); ?></span>
                                            <input type="text" name="mango_edit_name[<?php echo $s['id']; ?>]"
                                                   value="<?php echo esc_attr($s['name']); ?>" style="width:100%;max-width:320px">
                                        </p>
                                        <div class="mango-color-grid">
                                        <?php foreach ($scheme_color_fields as $f_key => $f_label):
                                            $val = $s[$f_key] ?? '';
                                            $def = $scheme_defaults[$f_key] ?? '';
                                        ?>
                                            <div class="mango-color-cell">
                                                <span><?php echo $f_label; ?></span>
                                                <input type="text" name="mango_edit_<?php echo $f_key; ?>[<?php echo $s['id']; ?>]"
                                                       value="<?php echo esc_attr($val); ?>"
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
                            + <?php _e('添加新配色', 'mango'); ?>
                        </button>

                        <div class="mango-edit-form mango-add-form" id="mango-add-scheme-form" style="display:none;margin-top:16px">
                            <h4 style="margin:0 0 12px"><?php _e('新配色方案', 'mango'); ?></h4>
                            <p style="margin:0 0 12px">
                                <span style="font-size:12px;font-weight:600;color:#3c434a;display:block;margin-bottom:2px"><?php _e('方案名称 *', 'mango'); ?></span>
                                <input type="text" name="mango_new_scheme_name" style="width:100%;max-width:320px"
                                       placeholder="<?php _e('例：我的主题配色', 'mango'); ?>">
                            </p>
                            <div class="mango-color-grid">
                            <?php foreach ($scheme_color_fields as $f_key => $f_label):
                                $def = $scheme_defaults[$f_key] ?? '';
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
                        <h3><?php _e('卡片圆角', 'mango'); ?></h3>
                        <p class="description"><?php _e('控制所有玻璃卡片的统一圆角大小。', 'mango'); ?></p>
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

                    <p class="submit">
                        <button type="submit" name="mango_save" class="button button-primary">
                            <?php _e('保存设置', 'mango'); ?>
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
            if (confirm("<?php _e('确定删除配色方案"', 'mango'); ?>" + name + "<?php _e('"吗？', 'mango'); ?>")) {
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
    .mango-settings-wrap { display:flex; gap:24px; margin-top:16px; align-items:flex-start; }
    .mango-settings-sidebar { flex-shrink:0; width:200px; background:#fff; border:1px solid #c3c4c7; border-radius:4px; overflow:hidden; }
    .mango-sidebar-tab { display:flex; align-items:center; gap:8px; padding:14px 16px; text-decoration:none; color:#2c3338; border-bottom:1px solid #f0f0f1; font-size:14px; font-weight:500; }
    .mango-sidebar-tab:last-child { border-bottom:none; }
    .mango-sidebar-tab .dashicons { color:#8c8f94; }
    .mango-sidebar-tab:hover { background:#f6f7f7; color:#135e96; }
    .mango-sidebar-tab.active { background:#2271b1; color:#fff; }
    .mango-sidebar-tab.active .dashicons { color:#fff; }
    .mango-settings-content { flex:1; min-width:0; background:#fff; border:1px solid #c3c4c7; border-radius:4px; padding:20px 24px; }
    .mango-scheme-section { margin-bottom:28px; }
    .mango-scheme-section h3 { margin:0 0 12px; font-size:14px; font-weight:600; }
    .mango-scheme-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; margin-bottom:16px; }
    .mango-scheme-card { display:block; border:1px solid #dcdcde; border-radius:4px; padding:12px; cursor:pointer; transition:border-color 0.15s; background:#f6f7f7; position:relative; }
    .mango-scheme-card.selected { border-color:#2271b1; box-shadow:0 0 0 1px #2271b1; background:#f0f6fc; }
    .mango-scheme-card input[type="radio"] { position:absolute; opacity:0; }
    .mango-scheme-preview { display:flex; gap:6px; margin-bottom:8px; }
    .mango-scheme-preview span { width:28px; height:28px; border-radius:4px; border:1px solid rgba(0,0,0,0.1); }
    .mango-scheme-info { margin-bottom:4px; }
    .mango-scheme-info strong { display:block; font-size:13px; }
    .mango-scheme-info span { font-size:11px; color:#646970; }
    .mango-scheme-badge { display:inline-block; padding:1px 8px; border-radius:3px; background:#2271b1; color:#fff; font-size:10px; font-weight:600; position:absolute; top:10px; right:10px; }
    .mango-scheme-card--edit { padding-bottom:6px; }
    .mango-scheme-select { display:block; cursor:pointer; }
    .mango-scheme-actions { display:flex; gap:6px; margin-top:4px; }
    .mango-scheme-actions .button { font-size:11px; min-height:0; padding:2px 10px; line-height:1.8; }
    .mango-edit-form { background:#fff; border:1px solid #dcdcde; border-radius:4px; padding:12px; margin-top:8px; }
    .mango-edit-form .regular-text { width:100%; max-width:320px; }
    .mango-color-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:8px; }
    .mango-color-cell { display:flex; flex-direction:column; gap:3px; }
    .mango-color-cell span { font-size:11px; color:#50575e; white-space:nowrap; }
    .mango-add-form { border-style:dashed; background:#f9f9f9; }
    .mango-radius-control { display:flex; align-items:center; gap:12px; max-width:360px; }
    .mango-radius-control input[type="range"] { flex:1; }
    .mango-radius-value { font-size:16px; font-weight:600; color:#2271b1; min-width:44px; }
    @media (max-width:782px) {
        .mango-settings-wrap { flex-direction:column; }
        .mango-settings-sidebar { width:100%; display:flex; }
        .mango-sidebar-tab { flex:1; justify-content:center; border-bottom:none; border-right:1px solid #f0f0f1; }
        .mango-sidebar-tab:last-child { border-right:none; }
        .mango-scheme-grid { grid-template-columns:1fr; }
    }
    </style>

    <?php
}

/**
 * 向前端输出自定义配色的 CSS 变量
 */
function mango_output_custom_css(): void {
    $style  = get_theme_mod('mango_theme_style', 'anime');

    // 仅对自定义方案（custom_xxx）输出 CSS 变量
    if (!str_starts_with($style, 'custom_')) {
        return;
    }

    $scheme = mango_get_color_scheme($style);
    if (!$scheme) {
        return;
    }

    // 所有可自定义的 CSS 变量映射
    $css_var_map = [
        'bg'          => '--bg',
        'glass'       => '--glass',
        'glass_hover' => '--glass-hover',
        'border'      => '--border',
        'border_hover'=> '--border-hover',
        'purple'      => '--purple',
        'purple_glow' => '--purple-glow',
        'blue'        => '--blue',
        'blue_glow'   => '--blue-glow',
        'text'        => '--text',
        'text_muted'  => '--text-muted',
        'text_dim'    => '--text-dim',
    ];

    $rules = [];
    foreach ($css_var_map as $key => $css_var) {
        if (!empty($scheme[$key])) {
            $rules[] = "{$css_var}: {$scheme[$key]};";
        }
    }

    if (empty($rules)) {
        return;
    }

    echo '<style id="mango-custom-colors">' . "\n";
    echo "body.anime-theme {\n";
    echo '  ' . implode("\n  ", $rules) . "\n";
    echo "}\n";

    echo '</style>' . "\n";
}
add_action('wp_head', 'mango_output_custom_css', 100);

/**
 * 向前端输出卡片圆角 CSS 变量
 */
function mango_output_radius_css(): void {
    $radius = get_theme_mod('mango_card_radius', 25);
    $radius = intval($radius);
    if ($radius < 0 || $radius > 50) {
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
add_action('wp_head', 'mango_output_radius_css', 99);

/**
 * 检查单个友链的健康状态
 */
function mango_check_link_health(string $url): array {
    $result = [
        'status'        => 'unknown',
        'response_time' => 0,
        'last_checked'  => current_time('mysql'),
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
        'headers'     => ['User-Agent' => $user_agents[array_rand($user_agents)]],
    ];

    // 请求策略：逐步降级
    $strategies = [
        // 策略1: HEAD + SSL 验证
        ['type' => 'HEAD', 'args' => $base_args],
        // 策略2: GET + SSL 验证
        ['type' => 'GET',  'args' => array_merge($base_args, ['timeout' => 15])],
        // 策略3: GET + 跳过 SSL 验证（处理自签证书等）
        ['type' => 'GET',  'args' => array_merge($base_args, ['timeout' => 15, 'sslverify' => false])],
    ];

    $last_error = '';

    foreach ($strategies as $strategy) {
        $start    = microtime(true);

        if ($strategy['type'] === 'HEAD') {
            $response = wp_remote_head($url, $strategy['args']);
        } else {
            $response = wp_remote_get($url, $strategy['args']);
        }

        $elapsed = microtime(true) - $start;

        $code = wp_remote_retrieve_response_code($response);

        if (is_wp_error($response)) {
            $last_error = $response->get_error_message();
            continue; // 尝试下一策略
        }

        // 获取成功：更新时间并判断状态
        $result['response_time'] = round($elapsed, 3);

        if ($code >= 200 && $code < 400) {
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
function mango_fetch_link_posts(string $feed_url): array {
    if (empty($feed_url)) {
        return [];
    }

    $body = null;

    // 方法1: WordPress HTTP API
    $args = [
        'timeout'    => 15,
        'redirection' => 3,
        'headers'    => ['User-Agent' => 'Mozilla/5.0 (compatible; MangoBot/1.0; Feed Fetcher)'],
        'sslverify'  => true,
    ];

    $response = wp_remote_get($feed_url, $args);
    if (!is_wp_error($response)) {
        $code = wp_remote_retrieve_response_code($response);
        if ($code >= 200 && $code < 400) {
            $body = wp_remote_retrieve_body($response);
        }
    }

    // 方法2: WordPress HTTP API 跳过 SSL 验证
    if (empty($body)) {
        $args['sslverify'] = false;
        $response = wp_remote_get($feed_url, $args);
        if (!is_wp_error($response)) {
            $code = wp_remote_retrieve_response_code($response);
            if ($code >= 200 && $code < 400) {
                $body = wp_remote_retrieve_body($response);
            }
        }
    }

    // 方法3: file_get_contents 兜底
    if (empty($body) && ini_get('allow_url_fopen')) {
        $ctx = stream_context_create([
            'http' => [
                'timeout'    => 10,
                'user_agent' => 'Mozilla/5.0 (compatible; MangoBot/1.0; Feed Fetcher)',
                'follow_location' => 3,
            ],
            'ssl' => [
                'verify_peer'      => false,
                'verify_peer_name' => false,
            ],
        ]);
        $fetched = @file_get_contents($feed_url, false, $ctx);
        if ($fetched !== false) {
            $body = $fetched;
        }
    }

    if (empty($body)) {
        return [];
    }

    // 清理 BOM 和非法字符
    $body = preg_replace('/^\xEF\xBB\xBF/', '', $body); // UTF-8 BOM

    libxml_use_internal_errors(true);

    // 尝试1: 剥离默认命名空间再解析（兼容性最好）
    $stripped = preg_replace('/(<\w+)\s+xmlns\s*=\s*["\'][^"\']*["\'](\s*)/', '$1$2', $body, 1);
    $xml = simplexml_load_string($stripped);

    // 尝试2: 原始 XML + XPath
    if (!$xml) {
        $xml = simplexml_load_string($body);
    }

    // 尝试3: 只看是否是 Atom 格式，用字符串解析
    if (!$xml && str_contains($body, '<feed') && str_contains($body, '<entry')) {
        // 直接正则提取
        $posts = [];
        $entry_pattern = '/<entry>.*?<\/entry>/s';
        preg_match_all($entry_pattern, $body, $entries);

        if (!empty($entries[0])) {
            foreach ($entries[0] as $entry_xml) {
                $title = '';
                $link  = '';
                $pub   = '';

                if (preg_match('/<title[^>]*>(.*?)<\/title>/s', $entry_xml, $m)) {
                    $title = trim(html_entity_decode(strip_tags($m[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
                }
                if (preg_match('/<link[^>]*href\s*=\s*"([^"]+)"/', $entry_xml, $m)) {
                    $link = $m[1];
                }
                if (preg_match('/<published[^>]*>(.*?)<\/published>/s', $entry_xml, $m)) {
                    $pub = trim($m[1]);
                }
                if (empty($pub) && preg_match('/<updated[^>]*>(.*?)<\/updated>/s', $entry_xml, $m)) {
                    $pub = trim($m[1]);
                }

                if (empty($title) || empty($link)) continue;

                $posts[] = [
                    'title'     => mb_substr($title, 0, 120),
                    'link'      => $link,
                    'published' => $pub ? date_i18n('Y-m-d', strtotime($pub)) : '',
                ];

                if (count($posts) >= 5) break;
            }
        }
        return $posts;
    }

    if (!$xml) {
        return [];
    }

    $posts = [];

    // RSS 2.0
    if (isset($xml->channel->item)) {
        // dc 命名空间
        $dc = $xml->channel->children('http://purl.org/dc/elements/1.1/');
        foreach ($xml->channel->item as $item) {
            $title = trim((string)$item->title);
            $link  = trim((string)$item->link);
            $pub   = trim((string)$item->pubDate ?? '');
            if (empty($pub) && isset($dc->date)) {
                $pub = trim((string)$dc->date);
            }

            if (empty($title) || empty($link)) continue;

            $posts[] = [
                'title'     => mb_substr($title, 0, 120),
                'link'      => $link,
                'published' => $pub ? date_i18n('Y-m-d', strtotime($pub)) : '',
            ];

            if (count($posts) >= 5) break;
        }
    }

    // Atom — 命名空间已剥离或原始 XPath
    if (empty($posts)) {
        // 先尝试直接访问 entry（命名空间已剥离的 XML）
        $entries = null;
        if (isset($xml->entry)) {
            $entries = $xml->entry;
        }

        // 再尝试 XPath（带命名空间的原始 XML）
        if (!$entries) {
            $atom_ns = 'http://www.w3.org/2005/Atom';
            @$xml->registerXPathNamespace('atom', $atom_ns);
            $xpath_result = $xml->xpath('//atom:entry');
            if ($xpath_result && count($xpath_result) > 0) {
                $entries = $xpath_result;
            }
        }

        if ($entries) {
            foreach ($entries as $entry) {
                $title = trim((string)$entry->title);
                $link  = '';
                foreach ($entry->link as $l) {
                    $attrs = $l->attributes();
                    $rel   = (string)($attrs['rel'] ?? '');
                    if ($rel === 'alternate' || $rel === '') {
                        $link = (string)($attrs['href'] ?? '');
                        break;
                    }
                }
                $pub = trim((string)$entry->published ?? (string)$entry->updated ?? '');

                if (empty($title) || empty($link)) continue;

                $posts[] = [
                    'title'     => mb_substr($title, 0, 120),
                    'link'      => $link,
                    'published' => $pub ? date_i18n('Y-m-d', strtotime($pub)) : '',
                ];

                if (count($posts) >= 5) break;
            }
        }
    }

    return $posts;
}

/**
 * 将十六进制颜色转为 HSL 数组（Stellar label 格式）
 */
function mango_hex_to_hsl(string $hex): array {
    $hex = ltrim($hex, '#');
    if (strlen($hex) !== 6) {
        return ['hue' => 0, 'saturation' => 0, 'lightness' => 0];
    }
    $r = hexdec(substr($hex, 0, 2)) / 255;
    $g = hexdec(substr($hex, 2, 2)) / 255;
    $b = hexdec(substr($hex, 4, 2)) / 255;

    $max = max($r, $g, $b);
    $min = min($r, $g, $b);
    $delta = $max - $min;

    $hue = 0;
    $saturation = 0;
    $lightness = ($max + $min) / 2;

    if ($delta > 0) {
        $saturation = $lightness > 0.5
            ? $delta / (2 - $max - $min)
            : $delta / ($max + $min);

        switch ($max) {
            case $r:
                $hue = (($g - $b) / $delta + ($g < $b ? 6 : 0)) / 6;
                break;
            case $g:
                $hue = (($b - $r) / $delta + 2) / 6;
                break;
            case $b:
                $hue = (($r - $g) / $delta + 4) / 6;
                break;
        }
    }

    return [
        'hue'        => round($hue * 360),
        'saturation' => round($saturation * 100),
        'lightness'  => round($lightness * 100),
    ];
}

/**
 * 获取所有友链的完整数据（含健康状态标签和订阅文章）
 * 数据格式对齐 Stellar friends_and_posts
 */
function mango_get_enriched_links(): array {
    $bookmarks = get_bookmarks([
        'orderby'        => 'rating',
        'order'          => 'DESC',
        'hide_invisible' => 1,
        'show_updated'   => 0,
    ]);

    $links = [];
    foreach ($bookmarks as $bm) {
        $link_id  = $bm->link_id;
        $feed_url = trim($bm->link_rss ?? '');
        $url      = $bm->link_url;

        // 单条健康检查缓存
        $health_key = 'mango_link_health_' . $link_id;
        $health = get_transient($health_key);

        if ($health === false) {
            $health = mango_check_link_health($url);
            set_transient($health_key, $health, 6 * HOUR_IN_SECONDS);
        }

        // 单条文章缓存
        $post_key = 'mango_link_posts_' . $link_id;
        $posts = get_transient($post_key);

        if ($posts === false && !empty($feed_url)) {
            $posts = mango_fetch_link_posts($feed_url);
            // RSS 解析失败时降级到手动设置的代表文章
            if (empty($posts)) {
                $manual = get_option('mango_link_articles_' . $link_id, []);
                if (!empty($manual)) {
                    $posts = $manual;
                }
            }
            set_transient($post_key, $posts, HOUR_IN_SECONDS);
        } elseif (empty($feed_url)) {
            // 无 RSS 时使用手动设置的「代表文章」
            $manual = get_option('mango_link_articles_' . $link_id, []);
            $posts = is_array($manual) ? $manual : [];
        }

        // 生成 Stellar 格式的 labels
        $labels = [];

        // 健康状态标签
        $health_colors = [
            'alive'   => ['name' => '在线',   'color' => '4ade80'],
            'dead'    => ['name' => '失联',   'color' => 'ff6b6b'],
            'unknown' => ['name' => '未知',   'color' => 'a0a8c0'],
        ];

        $status = $health['status'] ?? 'unknown';
        if (isset($health_colors[$status])) {
            $hc = $health_colors[$status];
            $hsl = mango_hex_to_hsl($hc['color']);
            $labels[] = [
                'name'       => $hc['name'],
                'color'      => $hc['color'],
                'lightness'  => $hsl['lightness'],
                'saturation' => $hsl['saturation'],
                'hue'        => $hsl['hue'],
            ];
        }

        // 响应时间标签（仅在线时）
        if ($status === 'alive' && $health['response_time'] > 0) {
            $rt_ms = round($health['response_time'] * 1000);
            $rt_color = $rt_ms < 500 ? '4ade80' : ($rt_ms < 1500 ? 'fbbf24' : 'fb923c');
            $hsl = mango_hex_to_hsl($rt_color);
            $labels[] = [
                'name'       => $rt_ms < 1000 ? $rt_ms . 'ms' : round($health['response_time'], 2) . 's',
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
    usort($links, function (array $a, array $b): int {
        $a_has_rss  = !empty($a['feed']);
        $b_has_rss  = !empty($b['feed']);
        $a_has_posts = !empty($a['posts']);
        $b_has_posts = !empty($b['posts']);

        // 分组优先级：有文章（RSS 或手动）=0，有 RSS 无文章=1，无 RSS 无文章=2
        $a_group = $a_has_posts ? 0 : ($a_has_rss ? 1 : 2);
        $b_group = $b_has_posts ? 0 : ($b_has_rss ? 1 : 2);

        if ($a_group !== $b_group) {
            return $a_group <=> $b_group;
        }

        // 同组：按最新文章日期降序
        $a_date = $a_has_posts ? ($a['posts'][0]['published'] ?? '') : '';
        $b_date = $b_has_posts ? ($b['posts'][0]['published'] ?? '') : '';

        if ($a_date !== $b_date) {
            return strcmp($b_date, $a_date); // 降序（最新的在前）
        }

        return 0;
    });

    return $links;
}

/**
 * 注册自定义 REST API 路由
 */
function mango_register_links_routes(): void {
    // GET /links — 获取所有友链（含健康状态和文章）
    register_rest_route('mango/v1', '/links', [
        'methods'  => 'GET',
        'callback' => function (): WP_REST_Response {
            $links = mango_get_enriched_links();
            return new WP_REST_Response($links, 200);
        },
        'permission_callback' => '__return_true',
    ]);

    // POST /links/refresh — 手动触发友链数据刷新（需管理员权限）
    register_rest_route('mango/v1', '/links/refresh', [
        'methods'             => 'POST',
        'callback'            => function (): WP_REST_Response {
            // 清除所有健康检查和文章缓存
            $bookmarks = get_bookmarks(['hide_invisible' => 0]);
            foreach ($bookmarks as $bm) {
                delete_transient('mango_link_health_' . $bm->link_id);
                delete_transient('mango_link_posts_' . $bm->link_id);
            }
            $links = mango_get_enriched_links();
            return new WP_REST_Response([
                'message' => __('友链数据已刷新', 'mango'),
                'links'   => $links,
            ], 200);
        },
        'permission_callback' => function (): bool {
            return current_user_can('manage_options');
        },
    ]);
}
add_action('rest_api_init', 'mango_register_links_routes');

/**
 * 在友链编辑/添加页面添加提示信息
 */
function mango_link_manager_rss_help(): void {
    $screen = get_current_screen();
    if ($screen && $screen->base === 'link') {
        echo '<p class="description" style="margin:8px 0 0;color:#646970;">';
        _e('「RSS 地址」字段填写友链的 RSS/Atom 订阅链接，友链页面将自动显示该站点的最近文章。', 'mango');
        echo '</p>';
    }
}
add_action('admin_footer', 'mango_link_manager_rss_help');

/**
 * 添加「代表文章」元框到友链编辑页面
 * 用于没有 RSS 订阅的友链手动设置代表文章
 */
function mango_add_link_articles_meta_box(): void {
    add_meta_box(
        'mango_link_articles',
        __('代表文章', 'mango'),
        'mango_render_link_articles_meta_box',
        'link',
        'normal',
        'default'
    );
}
add_action('add_meta_boxes', 'mango_add_link_articles_meta_box');

/**
 * 渲染代表文章元框
 */
function mango_render_link_articles_meta_box(object $post): void {
    $link_id = $post->link_id ?? $post->ID ?? 0;
    $articles = get_option('mango_link_articles_' . $link_id, []);
    if (!is_array($articles)) {
        $articles = [];
    }
    wp_nonce_field('mango_link_articles_save', 'mango_link_articles_nonce');
    ?>
    <div id="mango-articles-repeater">
        <p class="description"><?php _e('为没有 RSS 的友链手动设置代表文章（最多 5 篇），填写文章标题、链接和发布时间。', 'mango'); ?></p>
        <table class="widefat striped" style="margin-top:10px;">
            <thead>
                <tr>
                    <th style="width:5%;">#</th>
                    <th style="width:35%;"><?php _e('文章标题', 'mango'); ?></th>
                    <th style="width:35%;"><?php _e('文章链接', 'mango'); ?></th>
                    <th style="width:15%;"><?php _e('发布时间', 'mango'); ?></th>
                    <th style="width:10%;"><?php _e('操作', 'mango'); ?></th>
                </tr>
            </thead>
            <tbody id="mango-articles-tbody">
                <?php foreach ($articles as $i => $a): ?>
                <tr>
                    <td><?php echo $i + 1; ?></td>
                    <td><input type="text" name="mango_article_title[<?php echo $i; ?>]" value="<?php echo esc_attr($a['title'] ?? ''); ?>" class="widefat" /></td>
                    <td><input type="url" name="mango_article_link[<?php echo $i; ?>]" value="<?php echo esc_attr($a['link'] ?? ''); ?>" class="widefat" placeholder="https://" /></td>
                    <td><input type="date" name="mango_article_published[<?php echo $i; ?>]" value="<?php echo esc_attr($a['published'] ?? ''); ?>" class="widefat" /></td>
                    <td><button type="button" class="button mango-remove-article"><?php _e('删除', 'mango'); ?></button></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        <input type="hidden" id="mango-articles-count" name="mango_articles_count" value="<?php echo count($articles); ?>" />
        <button type="button" class="button" id="mango-add-article" style="margin-top:8px;">+ <?php _e('添加文章', 'mango'); ?></button>
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
function mango_save_link_articles(int $link_id): void {
    if (!isset($_POST['mango_link_articles_nonce']) || !wp_verify_nonce($_POST['mango_link_articles_nonce'], 'mango_link_articles_save')) {
        return;
    }
    if (!current_user_can('manage_links')) {
        return;
    }

    $count = intval($_POST['mango_articles_count'] ?? 0);
    $articles = [];

    for ($i = 0; $i < $count; $i++) {
        $title = sanitize_text_field($_POST['mango_article_title'][$i] ?? '');
        $link  = esc_url_raw($_POST['mango_article_link'][$i] ?? '');
        $pub   = sanitize_text_field($_POST['mango_article_published'][$i] ?? '');
        if (!empty($title) && !empty($link)) {
            $articles[] = [
                'title'     => $title,
                'link'      => $link,
                'published' => $pub,
            ];
        }
    }

    if (!empty($articles)) {
        update_option('mango_link_articles_' . $link_id, $articles, false);
    } else {
        delete_option('mango_link_articles_' . $link_id);
    }
}
add_action('edit_link', 'mango_save_link_articles');
