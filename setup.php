<?php

if (!defined('GLPI_ROOT')) {
    die('Direct access is not allowed');
}

define('PLUGIN_ASSETLABEL_VERSION', '0.1.0');
define('PLUGIN_ASSETLABEL_MIN_GLPI', '11.0.0');
define('PLUGIN_ASSETLABEL_MAX_GLPI', '11.99.99');

function plugin_init_assetlabel(): void
{
    global $PLUGIN_HOOKS;

    Plugin::registerClass('PluginAssetlabelLabel', [
        'addtabon' => PluginAssetlabelLabel::getSupportedItemtypes(),
    ]);

    $PLUGIN_HOOKS['csrf_compliant']['assetlabel'] = true;
    $PLUGIN_HOOKS['post_item_form']['assetlabel'] = 'plugin_assetlabel_post_item_form';
    $PLUGIN_HOOKS['add_css']['assetlabel'] = 'css/assetlabel-014l.css';
    $PLUGIN_HOOKS['add_javascript']['assetlabel'] = 'js/assetlabel-014c.js';
}

function plugin_version_assetlabel(): array
{
    return [
        'name' => 'Asset Label',
        'version' => PLUGIN_ASSETLABEL_VERSION,
        'author' => 'Nicolabs91',
        'license' => 'GPLv3+',
        'requirements' => [
            'glpi' => [
                'min' => PLUGIN_ASSETLABEL_MIN_GLPI,
                'max' => PLUGIN_ASSETLABEL_MAX_GLPI,
            ],
            'php' => [
                'min' => '8.2',
            ],
        ],
    ];
}

function plugin_assetlabel_check_prerequisites(): bool
{
    return version_compare(GLPI_VERSION, PLUGIN_ASSETLABEL_MIN_GLPI, '>=')
        && version_compare(GLPI_VERSION, PLUGIN_ASSETLABEL_MAX_GLPI, '<=');
}

function plugin_assetlabel_check_config(bool $verbose = false): bool
{
    return true;
}
