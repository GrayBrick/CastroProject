package castroproject.survival.autosorting.gui;

import castroproject.common.BukkitPlugin;
import castroproject.common.gui.CustomGui;
import castroproject.common.utils.ItemBuilder;
import castroproject.common.utils.TextUtils;
import castroproject.survival.Survival;
import castroproject.survival.autosorting.AutoSortingManager;
import castroproject.survival.autosorting.ChestSystemPart;
import net.kyori.adventure.text.Component;
import org.bukkit.Material;
import org.bukkit.block.Chest;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.InventoryType;
import org.checkerframework.checker.nullness.qual.NonNull;

import javax.annotation.Nonnull;

public class SettingsChestSystemPart extends CustomGui {

    public SettingsChestSystemPart(@NonNull Survival plugin, @Nonnull Player player, @Nonnull ChestSystemPart chestSystemPart) {
        super(plugin, 1, Component.text("Настройка сундука"));

        this.setExistingItem(0, (left, shift) -> {
            if (left) {
                plugin.get(AutoSortingManager.class).chestsWaitConsumer.put(player, chestSystemPart);
            } else {
                plugin.get(AutoSortingManager.class).chestsWaitProducer.put(player, chestSystemPart);
            }
            player.sendMessage(Component.text("Выберите сундук и нажмите на него для образования связей").color(Survival.INFO_COLOR));
            player.closeInventory();
        }, new ItemBuilder(Material.DISPENSER)
                .name(Component.text("Режим добавления связей").color(Survival.INFO_COLOR_BOLT))
                .lore(Component.text("ЛКМ - добавление потребителей").color(Survival.INFO_COLOR),
                        Component.text("ПКМ - добавление снабжающих сундуков").color(Survival.INFO_COLOR))
                .build());

        this.setExistingItem(1, (left, shift) -> {
            player.sendMessage(Component.text("Выберите сундук и нажмите на него для удаления").color(Survival.INFO_COLOR));
            plugin.get(AutoSortingManager.class).chestsWaitRemoveConsumer.put(player, chestSystemPart);
            player.closeInventory();
        }, new ItemBuilder(Material.BARRIER)
                .name(Component.text("Режим удаления потребителей").color(Survival.INFO_COLOR_BOLT))
                .lore(Component.text("После нажатия,").color(Survival.INFO_COLOR),
                        Component.text("Нажимайте по сундукам, которым").color(Survival.INFO_COLOR),
                        Component.text("хотите отключить снабжение").color(Survival.INFO_COLOR),
                        Component.text("из этого сундука.").color(Survival.INFO_COLOR_BOLT),
                        Component.text("Для выключения режима").color(Survival.INFO_COLOR),
                        Component.text("Откройте настройки этого сундука").color(Survival.INFO_COLOR))
                .build());

        this.setExistingItem(2, (left, shift) -> {
            new SettingsFilter(plugin, player, chestSystemPart, this).open(player);
        }, new ItemBuilder(Material.COMPARATOR)
                .name(Component.text("Настройка фильтра").color(Survival.INFO_COLOR_BOLT))
                .lore(Component.text("Тут вы сможете выбрать").color(Survival.INFO_COLOR),
                        Component.text("какие предметы будут").color(Survival.INFO_COLOR),
                        Component.text("Поступать в этот сундук").color(Survival.INFO_COLOR))
                .build());

        this.setExistingItem(3, (left, shift) -> {
            new SettingsPriority(plugin, player, chestSystemPart, this).open(player);
        }, new ItemBuilder(Material.RECOVERY_COMPASS)
                .name(Component.text("Текущий приоритет: ").color(Survival.INFO_COLOR_BOLT).append(Component.text(chestSystemPart.getPriority() + 1)).color(Survival.WARN_COLOR))
                .lore(Component.text("От приоритета зависит очередность").color(Survival.INFO_COLOR),
                        Component.text("заполнения сундуков").color(Survival.INFO_COLOR),
                        Component.text("Чем приоритет выше, тем меньше очередь у этого сундука").color(Survival.INFO_COLOR),
                        Component.text("Нажмите для настройки").color(Survival.INFO_COLOR_BOLT))
                .build());

        this.setExistingItem(4, (left, shift) -> {
            player.sendMessage(Component.text("Выберите сундуки для копирования настроек данного сундука").color(Survival.INFO_COLOR));
            plugin.get(AutoSortingManager.class).chestsAddCopyParameters.put(player, chestSystemPart);
            player.closeInventory();
        }, new ItemBuilder(Material.COBWEB)
                .name(Component.text("Связать сундуки").color(Survival.INFO_COLOR_BOLT))
                .lore(Component.text("Режим привязки других сундуков").color(Survival.INFO_COLOR),
                        Component.text("с данным сундуком").color(Survival.INFO_COLOR),
                        Component.text("Все остальные сундуки").color(Survival.INFO_COLOR),
                        Component.text("Будут точно с такими же установками").color(Survival.INFO_COLOR),
                        Component.text("Как и этот, будто это все вместе один сундук").color(Survival.INFO_COLOR))
                .build());

        this.setExistingItem(5, (left, shift) -> {
            if (plugin.get(AutoSortingManager.class).modeDelete.containsKey(player)) {
                player.sendMessage(Component.text("Режим просмотра уже включен в режим удаления").color(Survival.WARN_COLOR));
                return;
            }
            if (plugin.get(AutoSortingManager.class).playersShowChestSystem.remove(player) == null)
                plugin.get(AutoSortingManager.class).playersShowChestSystem.put(player, chestSystemPart);
            player.closeInventory();
        }, new ItemBuilder(Material.SPYGLASS)
                .name(Component.text("Режим просмотра").color(Survival.INFO_COLOR_BOLT))
                .lore(TextUtils.splitString(
                        "Сундуки начнут подсвечиваться частицами", AutoSortingManager.LENGTH_LORE_COMPONENT,
                        component -> component.color(Survival.INFO_COLOR)))
                .appendLore((TextUtils.splitString(
                        "Белый цвет - сундук только принимает материалы", AutoSortingManager.LENGTH_LORE_COMPONENT,
                        component -> component.color(Survival.WARN_COLOR))))
                .appendLore((TextUtils.splitString(
                        "Синий цвет - сундук только отдает материалы", AutoSortingManager.LENGTH_LORE_COMPONENT,
                        component -> component.color(Survival.WARN_COLOR))))
                .appendLore((TextUtils.splitString(
                        "Голубой цвет - сундук отдает и принимает материалы", AutoSortingManager.LENGTH_LORE_COMPONENT,
                        component -> component.color(Survival.WARN_COLOR))))
                .setShimmer(plugin.get(AutoSortingManager.class).playersShowChestSystem.containsKey(player))
                .build());

        this.setExistingItem(8, (left, shift) -> {
            this.plugin.get(AutoSortingManager.class).modeDelete.put(player, chestSystemPart);
            this.plugin.get(AutoSortingManager.class).playersShowChestSystem.remove(player);
            player.closeInventory();
            player.sendMessage(Component.text("Вы в режиме удаления связей").color(Survival.INFO_COLOR));
        }, new ItemBuilder(Material.LAVA_BUCKET)
                .name(Component.text("Включить режим удаления связей").color(Survival.INFO_COLOR_BOLT))
                .lore(Component.text("Вы сможете удалять другие").color(Survival.INFO_COLOR),
                        Component.text("сундуки из системы с помощью").color(Survival.INFO_COLOR),
                        Component.text("SHIFT + ПКМ с пустой рукой").color(Survival.INFO_COLOR),
                        Component.text("Если вы удалите связи с этого").color(Survival.INFO_COLOR),
                        Component.text("то режим выключится").color(Survival.INFO_COLOR))
                .build());
    }
}
