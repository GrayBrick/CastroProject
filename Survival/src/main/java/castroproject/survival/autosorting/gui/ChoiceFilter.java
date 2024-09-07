package castroproject.survival.autosorting.gui;

import castroproject.common.BukkitPlugin;
import castroproject.common.gui.CustomGui;
import castroproject.common.utils.ItemBuilder;
import castroproject.common.utils.ItemUtils;
import castroproject.survival.Survival;
import castroproject.survival.autosorting.ChestSystemPart;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.TranslatableComponent;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.inventory.CreativeCategory;
import org.bukkit.inventory.ItemStack;
import org.checkerframework.checker.nullness.qual.NonNull;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.text.DecimalFormat;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

public class ChoiceFilter extends CustomGui {

    private static final int MAX_COUNT_SLOT_FOR_ITEM = 51;

    private final DecimalFormat format = new DecimalFormat("0.0");

    protected ChoiceFilter(@NonNull Survival plugin,
                           @Nonnull Player player,
                           @Nonnull ChestSystemPart chestSystemPart,
                           int page,
                           boolean sortCount,
                           @Nullable CategoryFilter.CategoryMaterials category,
                           @Nullable CustomGui lastMenu) {
        super(plugin, 6, Component.text("Выбор фильтра, страница: ").color(Survival.INFO_COLOR).append(Component.text(page + 1).color(Survival.WARN_COLOR)));

        AtomicInteger countNullItem = new AtomicInteger(0);
        TreeMap<Material, Integer> allMaterial = chestSystemPart.getAllMaterialInSystemUp(this.plugin, countNullItem, chestSystemParts -> chestSystemPart.getNextChestSystemPart());
        player.sendMessage(Component.text("Количество пустых слотов: ").color(Survival.INFO_COLOR).append(Component.text(countNullItem.get()).color(Survival.WARN_COLOR)));

        TreeMap<Material, Integer> allFilteredMaterial = new TreeMap<>();

        if (category != null) {
            for (Map.Entry<Material, Integer> entry : allMaterial.entrySet()) {
                if (!category.materials().contains(entry.getKey())) continue;
                allFilteredMaterial.put(entry.getKey(), entry.getValue());
            }
        } else {
            allFilteredMaterial = allMaterial;
        }

        SortedSet<Map.Entry<Material, Integer>> sortedEntries = new TreeSet<>(
                sortCount ?
                        (e1, e2) -> e2.getValue() - e1.getValue() == 0 ? 1 : e2.getValue() - e1.getValue()
                        :
                        Comparator.comparing((Map.Entry<Material, Integer> o) -> plugin.localisationMap.get(o.getKey().translationKey()))
        );
        sortedEntries.addAll(allFilteredMaterial.entrySet());

        int startIndex = page * MAX_COUNT_SLOT_FOR_ITEM;
        int count = -1;
        int slot = 0;
        for (Map.Entry<Material, Integer> entry : sortedEntries) {
            if (!(++count >= startIndex && count < startIndex + MAX_COUNT_SLOT_FOR_ITEM)) continue;
            boolean containsInFilter = chestSystemPart.itemIsContainsInFilter(entry.getKey());
            final int thisSlot = slot;
            this.setExistingItem(slot++, (left, shift) -> {
                if (!left) {
                    final int maxStackSize = entry.getKey().getMaxStackSize();
                    final int maxCountAdded = shift ? 1 : maxStackSize;
                    int countAdded = chestSystemPart.moveItemsToPlayer(plugin, player, entry.getKey(), maxCountAdded);

                    if (entry.getValue() != 0)
                        entry.setValue(entry.getValue() - countAdded);

                    this.updateExistingItem(thisSlot, item -> {
                        if (item == null) return;
                        if (entry.getValue() == 0) {
                            item.setAmount(0);
                            return;
                        }
                        List<Component> lore = new ArrayList<>();

                        lore.add(Component.text("Количество: ")
                                .color(Survival.INFO_COLOR)
                                .append(Component.text(entry.getValue()).color(Survival.WARN_COLOR)));
                        lore.add(this.getShulkerCount(entry.getKey(), entry.getValue()).color(Survival.WARN_COLOR));
                        lore.add(containsInFilter ? Component.text("ЛКМ - ").color(Survival.INFO_COLOR).append(Component.text("Убрать из фильтра"))
                                .color(Survival.OFF_COLOR)
                                : Component.text("ЛКМ - ").color(Survival.INFO_COLOR).append(Component.text("Добавить в фильтр").color(Survival.ON_COLOR)));
                        lore.add(Component.text("ПКМ - Взять стак предмета в инвентарь").color(Survival.INFO_COLOR));
                        lore.add(Component.text("Шифт ПКМ - Взять один предмет в инвентарь").color(Survival.INFO_COLOR));

                        ItemUtils.fixItalic(lore);

                        item.lore(lore);
                    });

                    if (countAdded == -1) {
                        player.sendMessage(Component.text("Предметов нет в сундуках").color(Survival.ERROR_COLOR));
                        return;
                    }
                    if (countAdded == -2) {
                        player.sendMessage(Component.text("Недостаточно места для добавления предметов").color(Survival.ERROR_COLOR));
                        return;
                    }
                    if (countAdded == maxStackSize) {
                        player.sendMessage(Component.text("Добавлен стак предмета").color(Survival.INFO_COLOR_BOLT));
                        return;
                    }
                    player.sendMessage(Component.text("Добавлено ").color(Survival.INFO_COLOR_BOLT)
                            .append(Component.text(countAdded).color(Survival.WARN_COLOR))
                            .append(Component.text(" предметов")).color(Survival.INFO_COLOR_BOLT));
                    return;
                }
                if (this.getInventory().getItem(thisSlot) == null) {
                    new ChoiceFilter(plugin, player, chestSystemPart, page, sortCount, category, lastMenu).open(player);
                    return;
                }
                if (!containsInFilter) {
                    chestSystemPart.addFilterItemStack(this.plugin, new ItemStack(entry.getKey()));
                } else {
                    chestSystemPart.removeFilterItemStack(new ItemStack(entry.getKey()));
                }
                new ChoiceFilter(plugin, player, chestSystemPart, page, sortCount, category, lastMenu).open(player);
            }, new ItemBuilder(entry.getKey())
                    .lore(Component.text("Количество: ")
                                    .color(Survival.INFO_COLOR)
                                    .append(Component.text(entry.getValue()).color(Survival.WARN_COLOR)),
                            this.getShulkerCount(entry.getKey(), entry.getValue()).color(Survival.WARN_COLOR),
                            containsInFilter ? Component.text("ЛКМ - ").color(Survival.INFO_COLOR).append(Component.text("Убрать из фильтра"))
                                    .color(Survival.OFF_COLOR)
                                    : Component.text("ЛКМ - ").color(Survival.INFO_COLOR).append(Component.text("Добавить в фильтр").color(Survival.ON_COLOR)),
                            Component.text("ПКМ - Взять стак предмета в инвентарь").color(Survival.INFO_COLOR))
                    .setShimmer(containsInFilter)
                    .build());
        }

        this.setExistingItem(51, (left, shift) -> {
            int nextPage = page - 1;
            if (page == 0) nextPage = (int) Math.floor(sortedEntries.size() / (MAX_COUNT_SLOT_FOR_ITEM * 1.0));
            new ChoiceFilter(plugin, player, chestSystemPart, nextPage, sortCount, category, lastMenu).open(player);
        }, new ItemBuilder(Material.PAPER)
                .name(Component.text("Предыдущая страница").color(Survival.INFO_COLOR))
                .setShimmer(true)
                .build());

        this.setExistingItem(52, (left, shift) -> {
            if (lastMenu == null) {
                player.closeInventory();
                return;
            }
            lastMenu.openDefault(player);
        }, new ItemBuilder(Material.BOOK)
                .name(Component.text("Предыдущее меню").color(Survival.INFO_COLOR))
                .setShimmer(true)
                .build());

        this.setExistingItem(53, (left, shift) -> {
            int nextPage = page + 1;
            if (sortedEntries.size() < (nextPage) * MAX_COUNT_SLOT_FOR_ITEM) nextPage = 0;
            new ChoiceFilter(plugin, player, chestSystemPart, nextPage, sortCount, category, lastMenu).open(player);
        }, new ItemBuilder(Material.PAPER)
                .name(Component.text("Следующая страница").color(Survival.INFO_COLOR))
                .setShimmer(true)
                .build());
    }

    private Component getShulkerCount(Material material, int allCount) {
        int countStacks = (int) Math.floor((allCount * 1.0) / material.getMaxStackSize());
        int reminderOfDivision = allCount - countStacks * material.getMaxStackSize();

        return Component.text("шалкеров: " + format.format(countStacks / 27.0) + " (" + countStacks + " x " + material.getMaxStackSize() + " + " + reminderOfDivision + ")");
    }
}
