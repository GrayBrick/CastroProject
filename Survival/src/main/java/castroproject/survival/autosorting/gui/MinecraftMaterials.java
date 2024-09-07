package castroproject.survival.autosorting.gui;

import org.bukkit.Material;

public class MinecraftMaterials {

    public enum Category {
        BUILDING_BLOCKS,
        DECORATIONS,
        REDSTONE_AND_TRANSPORT,
        MISC,
        FOOD,
        TOOLS,
        COMBAT,
        POTIONS,
        CONSTRUCTION,
        NOT_CATEGORIES
    }

    public static Category getCategory(Material material) {
        return switch (material) {
            case MUSIC_DISC_CAT, MUSIC_DISC_BLOCKS, MUSIC_DISC_CHIRP, MUSIC_DISC_FAR, MUSIC_DISC_MALL, MUSIC_DISC_MELLOHI, MUSIC_DISC_STAL, MUSIC_DISC_STRAD, MUSIC_DISC_WARD, MUSIC_DISC_11, MUSIC_DISC_WAIT, MUSIC_DISC_OTHERSIDE, MUSIC_DISC_RELIC, MUSIC_DISC_5, MUSIC_DISC_PIGSTEP, DISC_FRAGMENT_5, TRIAL_SPAWNER, TRIAL_KEY, ANGLER_POTTERY_SHERD, ARCHER_POTTERY_SHERD, ARMS_UP_POTTERY_SHERD, BLADE_POTTERY_SHERD, BREWER_POTTERY_SHERD, BURN_POTTERY_SHERD, DANGER_POTTERY_SHERD, EXPLORER_POTTERY_SHERD, FRIEND_POTTERY_SHERD, HEART_POTTERY_SHERD, HEARTBREAK_POTTERY_SHERD, HOWL_POTTERY_SHERD, MINER_POTTERY_SHERD, MOURNER_POTTERY_SHERD, PLENTY_POTTERY_SHERD, PRIZE_POTTERY_SHERD, SHEAF_POTTERY_SHERD, SHELTER_POTTERY_SHERD, SKULL_POTTERY_SHERD, SNORT_POTTERY_SHERD, PHANTOM_MEMBRANE, NAUTILUS_SHELL, HEART_OF_THE_SEA, GOAT_HORN, HONEYCOMB, BEE_NEST, BEEHIVE, HONEY_BOTTLE, HONEYCOMB_BLOCK, OCHRE_FROGLIGHT, VERDANT_FROGLIGHT, PEARLESCENT_FROGLIGHT, FROGSPAWN, ECHO_SHARD ->
                    Category.MISC;
            case TRIDENT, CROSSBOW ->
                    Category.COMBAT;
            case SUSPICIOUS_STEW, SWEET_BERRIES, GLOW_BERRIES ->
                    Category.FOOD;
            case LOOM, FLOWER_BANNER_PATTERN, CREEPER_BANNER_PATTERN, SKULL_BANNER_PATTERN, MOJANG_BANNER_PATTERN, GLOBE_BANNER_PATTERN, PIGLIN_BANNER_PATTERN, BELL, LANTERN, SOUL_LANTERN, CAMPFIRE, SOUL_CAMPFIRE, CANDLE, WHITE_CANDLE, ORANGE_CANDLE, MAGENTA_CANDLE, LIGHT_BLUE_CANDLE, YELLOW_CANDLE, LIME_CANDLE, PINK_CANDLE, GRAY_CANDLE, LIGHT_GRAY_CANDLE, CYAN_CANDLE, PURPLE_CANDLE, BLUE_CANDLE, BROWN_CANDLE, GREEN_CANDLE, RED_CANDLE, BLACK_CANDLE ->
                    Category.DECORATIONS;
            case COMPOSTER, BARREL, SMOKER, BLAST_FURNACE, CARTOGRAPHY_TABLE, FLETCHING_TABLE, GRINDSTONE, SMITHING_TABLE, STONECUTTER, RESPAWN_ANCHOR ->
                    Category.REDSTONE_AND_TRANSPORT;
            case SHROOMLIGHT, COPPER_GRATE, EXPOSED_COPPER_GRATE, WEATHERED_COPPER_GRATE, OXIDIZED_COPPER_GRATE, WAXED_COPPER_GRATE, WAXED_EXPOSED_COPPER_GRATE, WAXED_WEATHERED_COPPER_GRATE, WAXED_OXIDIZED_COPPER_GRATE, COPPER_BULB, EXPOSED_COPPER_BULB, WEATHERED_COPPER_BULB, OXIDIZED_COPPER_BULB, WAXED_COPPER_BULB, WAXED_EXPOSED_COPPER_BULB, WAXED_WEATHERED_COPPER_BULB, WAXED_OXIDIZED_COPPER_BULB, LODESTONE, CRYING_OBSIDIAN, BLACKSTONE, BLACKSTONE_SLAB, BLACKSTONE_STAIRS, GILDED_BLACKSTONE, POLISHED_BLACKSTONE, POLISHED_BLACKSTONE_SLAB, POLISHED_BLACKSTONE_STAIRS, CHISELED_POLISHED_BLACKSTONE, POLISHED_BLACKSTONE_BRICKS, POLISHED_BLACKSTONE_BRICK_SLAB, POLISHED_BLACKSTONE_BRICK_STAIRS, CRACKED_POLISHED_BLACKSTONE_BRICKS, SMALL_AMETHYST_BUD, MEDIUM_AMETHYST_BUD, LARGE_AMETHYST_BUD, AMETHYST_CLUSTER, POINTED_DRIPSTONE ->
                    Category.BUILDING_BLOCKS;
            case BRUSH, NETHERITE_UPGRADE_SMITHING_TEMPLATE, SENTRY_ARMOR_TRIM_SMITHING_TEMPLATE, DUNE_ARMOR_TRIM_SMITHING_TEMPLATE, COAST_ARMOR_TRIM_SMITHING_TEMPLATE, WILD_ARMOR_TRIM_SMITHING_TEMPLATE, WARD_ARMOR_TRIM_SMITHING_TEMPLATE, EYE_ARMOR_TRIM_SMITHING_TEMPLATE, VEX_ARMOR_TRIM_SMITHING_TEMPLATE, TIDE_ARMOR_TRIM_SMITHING_TEMPLATE, SNOUT_ARMOR_TRIM_SMITHING_TEMPLATE, RIB_ARMOR_TRIM_SMITHING_TEMPLATE, SPIRE_ARMOR_TRIM_SMITHING_TEMPLATE, WAYFINDER_ARMOR_TRIM_SMITHING_TEMPLATE, SHAPER_ARMOR_TRIM_SMITHING_TEMPLATE, SILENCE_ARMOR_TRIM_SMITHING_TEMPLATE, RAISER_ARMOR_TRIM_SMITHING_TEMPLATE, HOST_ARMOR_TRIM_SMITHING_TEMPLATE ->
                    Category.TOOLS;
            default -> Category.NOT_CATEGORIES;
        };
    }
}
