package castroproject.survival.autosorting.gui;

import castroproject.common.BukkitPlugin;
import castroproject.common.gui.CustomGui;
import castroproject.common.utils.ItemBuilder;
import castroproject.survival.Survival;
import castroproject.survival.autosorting.ChestSystemPart;
import net.kyori.adventure.text.Component;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.inventory.ItemStack;
import org.checkerframework.checker.nullness.qual.NonNull;
import org.jetbrains.annotations.NotNull;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

public class SettingsFilter extends CustomGui {

    private final ChestSystemPart chestSystemPart;
    private final Player player;
    private final Survival plugin;
    private final CustomGui lastMenu;

    public SettingsFilter(
            @NonNull Survival plugin,
            @Nonnull Player player,
            @Nonnull ChestSystemPart chestSystemPart,
            @Nullable CustomGui lastMenu) {
        super(plugin, 6, Component.text("Настройка фильтра"));
        this.chestSystemPart = chestSystemPart;
        this.player = player;
        this.plugin = plugin;
        this.lastMenu = lastMenu;

        Map<Material, Integer> allMaterialCount = chestSystemPart.getAllMaterialInSystemUp(this.plugin, new AtomicInteger(0), chestSystemParts -> chestSystemPart.getNextChestSystemPart());

        this.setExistingItem(0, null,
                new ItemBuilder(Material.PAPER)
                        .name(Component.text("Информация").color(Survival.INFO_COLOR_BOLT))
                        .lore(Component.text("Нажмите на любой предмет").color(Survival.INFO_COLOR),
                                Component.text("В своем инвентаре").color(Survival.INFO_COLOR),
                                Component.text("Этот предмет добавится в фильтр").color(Survival.INFO_COLOR),
                                Component.text("Но сама вещь у вас не заберется").color(Survival.INFO_COLOR),
                                Component.text("Выбранный предмет будет попадать в этот сундук").color(Survival.INFO_COLOR),
                                Component.text(""),
                                Component.text("Если вы хотите убрать предмет из фильтра").color(Survival.INFO_COLOR),
                                Component.text("Просто кликните по нему").color(Survival.INFO_COLOR))
                        .build());

        this.setExistingItem(1, (left, shift) -> {
                    chestSystemPart.setFiltered(!chestSystemPart.isFiltered());
                    chestSystemPart.touchChest(this.plugin);
                    player.sendMessage(Component.text("Фильтр успешно изменен").color(Survival.INFO_COLOR));
                    new SettingsFilter(this.plugin, this.player, this.chestSystemPart, lastMenu).open(player);
                },
                new ItemBuilder(Material.HOPPER)
                        .name(chestSystemPart.isFiltered() ?
                                Component.text("Фильтр включен").color(Survival.ON_COLOR)
                                : Component.text("Фильтр выключен").color(Survival.OFF_COLOR))
                        .lore(Component.text("Если фильтр выключен,").color(Survival.INFO_COLOR),
                                Component.text("то сундук будет принимать любые предметы").color(Survival.INFO_COLOR))
                        .setShimmer(chestSystemPart.isFiltered())
                        .build());
        this.setExistingItem(2, (left, shift) -> {
            if (!shift) new ChoiceFilter(plugin, player, chestSystemPart, 0, left, null, this).open(player);
            else if (left) new CategoryFilter(plugin, player, chestSystemPart, this).open(player);
                },
                new ItemBuilder(Material.CHEST)
                        .name(Component.text("Выбрать фильтр").color(Survival.INFO_COLOR_BOLT))
                        .lore(Component.text("Там отобразятся только те предметы").color(Survival.INFO_COLOR),
                                Component.text("Которые есть в этой системе").color(Survival.INFO_COLOR),
                                Component.text("ЛКМ - сортировка по количеству").color(Survival.INFO_COLOR),
                                Component.text("ПКМ - сортировка по типу").color(Survival.INFO_COLOR),
                                Component.text("Шифт ЛКМ - поиск категориям").color(Survival.INFO_COLOR))
                        .build());

        this.setExistingItem(7, (left, shift) -> {
            if (lastMenu == null) {
                player.closeInventory();
                return;
            }
            lastMenu.openDefault(player);
        }, new ItemBuilder(Material.BOOK)
                .name(Component.text("Предыдущее меню").color(Survival.INFO_COLOR))
                .setShimmer(true)
                .build());

        this.setExistingItem(8, (left, shift) -> {
                    chestSystemPart.getFilter().clear();
                    player.sendMessage(Component.text("Фильтр успешно отчищен").color(Survival.INFO_COLOR));
                    new SettingsFilter(this.plugin, this.player, this.chestSystemPart, lastMenu).open(player);
                },
                new ItemBuilder(Material.RED_CONCRETE)
                        .name(Component.text("Отчистить фильтр").color(Survival.OFF_COLOR))
                        .build());

        int startSlot = 8;
        for (ItemStack itemStack : chestSystemPart.getFilter()) {
            Integer countThisItem = allMaterialCount.get(itemStack.getType());
            if (countThisItem == null) countThisItem = 0;
            final int slot = ++startSlot;
            this.setExistingItem(slot, (left, shift) -> {
                if (!chestSystemPart.removeFilterItemStack(itemStack)) {
                    player.sendMessage(Component.text("Ошибка отчистки фильтра").color(Survival.WARN_COLOR));
                    player.closeInventory();
                    return;
                }
                player.sendMessage(Component.text("Предмет успешно убран из фильтра").color(Survival.INFO_COLOR));
                new SettingsFilter(this.plugin, this.player, this.chestSystemPart, lastMenu).open(player);
            }, new ItemBuilder(itemStack.clone())
                    .lore(Component.text("Убрать из фильтра").color(Survival.INFO_COLOR),
                            Component.text("Общее количество предмета: ").color(Survival.INFO_COLOR_BOLT)
                                    .append(Component.text(countThisItem).color(Survival.WARN_COLOR)))
                    .build(), false);
        }
    }

    @Override
    public void onCustomAction(@NonNull InventoryClickEvent event, boolean isTopInventory) {
        if (isTopInventory) return;
        ItemStack itemStack = event.getCurrentItem();
        if (itemStack == null) return;
        if (this.chestSystemPart.getFilter().size() >= ChestSystemPart.MAX_ITEMS_IN_FILTER) {
            player.sendMessage(Component.text("Фильтр достиг максимума").color(Survival.WARN_COLOR));
            return;
        }
        if (!this.chestSystemPart.addFilterItemStack(this.plugin, itemStack)) {
            player.sendMessage(Component.text("Данный предмет уже добавлен в фильтр").color(Survival.WARN_COLOR));
            return;
        }
        player.sendMessage(Component.text("Данный предмет добавлен в фильтр").color(Survival.ON_COLOR));
        new SettingsFilter(this.plugin, this.player, this.chestSystemPart, this.lastMenu).open(player);
    }
}
