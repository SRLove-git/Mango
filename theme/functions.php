<?php
/**
 * Mango Theme — Module Loader
 *
 * @package Mango
 */

// Load modules in dependency order:
// 1. Helpers (utilities used by other modules)
// 2. Core features (setup, customizer)
// 3. Feature modules (links, topics)
// 4. Admin (depends on everything else)
$inc_dir = __DIR__ . '/inc';

$modules = [
    'helpers.php',
    'setup.php',
    'customizer.php',
    'links.php',
    'topics.php',
    'wiki.php',
    'music.php',
    'admin.php',
];

foreach ($modules as $module) {
    $path = "{$inc_dir}/{$module}";
    if (file_exists($path)) {
        require_once $path;
    }
}
