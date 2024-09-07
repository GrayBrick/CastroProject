package castroproject.survival.autosorting.gui;

import castroproject.common.BukkitPlugin;
import castroproject.common.gui.CustomGui;
import castroproject.common.utils.ItemBuilder;
import castroproject.survival.Survival;
import castroproject.survival.autosorting.ChestSystemPart;
import net.kyori.adventure.text.Component;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.checkerframework.checker.nullness.qual.NonNull;
import org.checkerframework.checker.units.qual.N;
import org.jetbrains.annotations.NotNull;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.HashMap;
import java.util.Map;

public class SettingsPriority extends CustomGui {

    private final Map<Integer, Material> priorityMaterial = new HashMap<>();
    private final CustomGui lastMenu;
    public SettingsPriority(
            @NonNull BukkitPlugin plugin,
            @Nonnull Player player,
            @Nonnull ChestSystemPart chestSystemPart,
            @Nullable CustomGui lastMenu) {
        super(plugin, 2, Component.text("Выбор приоритета").color(Survival.INFO_COLOR));
        this.lastMenu = lastMenu;

        priorityMaterial.put(0, Material.RED_CONCRETE);
        priorityMaterial.put(1, Material.ORANGE_CONCRETE);
        priorityMaterial.put(2, Material.YELLOW_CONCRETE);
        priorityMaterial.put(3, Material.LIME_CONCRETE);
        priorityMaterial.put(4, Material.CYAN_CONCRETE);
        priorityMaterial.put(5, Material.LIGHT_BLUE_CONCRETE);
        priorityMaterial.put(6, Material.MAGENTA_CONCRETE);
        priorityMaterial.put(7, Material.PURPLE_CONCRETE);
        priorityMaterial.put(8, Material.BLUE_CONCRETE);

        priorityMaterial.forEach((slot, material) -> {
            this.setPriorityButton(chestSystemPart, slot, player, material);
        });

        this.setExistingItem(17, (left, shift) -> {
            if (lastMenu == null) {
                player.closeInventory();
                return;
            }
            lastMenu.openDefault(player);
        }, new ItemBuilder(Material.BOOK)
                .name(Component.text("Предыдущее меню").color(Survival.INFO_COLOR))
                .setShimmer(true)
                .build());
    }

    private void setPriorityButton(@NotNull ChestSystemPart chestSystemPart, int slot, @NotNull Player player, @NotNull Material material) {
        boolean isThisPriority = chestSystemPart.getPriority() == slot;
        this.setExistingItem(slot, (left, shift) -> {
            if (isThisPriority) {
                player.sendMessage(Component.text("Этот приоритет уже стоит").color(Survival.WARN_COLOR));
                return;
            }
            player.sendMessage(Component.text("Вы установили приоритет ").color(Survival.INFO_COLOR).append(Component.text((slot + 1) + "/9").color(Survival.WARN_COLOR)));
            chestSystemPart.setPriority(slot);
            new SettingsPriority(plugin, player, chestSystemPart, this.lastMenu).open(player);
        }, new ItemBuilder(material)
                .name(isThisPriority ? Component.text("Выбран приоритет: " + (slot + 1)).color(Survival.INFO_COLOR) : Component.text("Установить приоритет: " + (slot + 1)).color(Survival.INFO_COLOR))
                .setShimmer(isThisPriority)
                .build());
    }
}
