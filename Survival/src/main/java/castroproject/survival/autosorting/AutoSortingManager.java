package castroproject.survival.autosorting;

import castroproject.common.Manager;
import castroproject.common.utils.YamlConfig;
import castroproject.survival.Survival;
import castroproject.survival.autosorting.gui.SettingsChestSystemPart;
import castroproject.survival.autosorting.gui.SettingsFilter;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.TextColor;
import org.bukkit.*;
import org.bukkit.block.Block;
import org.bukkit.block.Chest;
import org.bukkit.block.ShulkerBox;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.block.Action;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.block.BlockPlaceEvent;
import org.bukkit.event.inventory.*;
import org.bukkit.event.player.PlayerInteractEvent;
import org.bukkit.inventory.*;
import org.bukkit.inventory.meta.BlockStateMeta;
import org.jetbrains.annotations.NotNull;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.FileReader;
import java.util.*;
import java.util.function.Consumer;
import java.util.function.Supplier;

public class AutoSortingManager implements Manager, Listener {

    private static long MAX_TIME_LIVE_CHUNK_MS = 1000;
    public static final int LENGTH_LORE_COMPONENT = 30;
    private final Survival plugin;
    private final Set<Player> nowClickPlayers = new HashSet<>();
    public final Set<ChestSystemPart> chestSystemPartSet = new HashSet<>();
    public final Map<Player, ChestSystemPart> chestsWaitConsumer = new HashMap<>();
    public final Map<Player, ChestSystemPart> chestsWaitProducer = new HashMap<>();
    public final Map<Player, ChestSystemPart> chestsWaitRemoveConsumer = new HashMap<>();

    public final Map<Player, ChestSystemPart> chestsAddCopyParameters = new HashMap<>();
    public final Map<Player, ChestSystemPart> modeDelete = new HashMap<>();

    public final Map<Player, ChestSystemPart> playersShowChestSystem = new HashMap<>();
    public final Map<Chunk, Long> loadedChunks = new HashMap<>();
    private final YamlConfig config;

    public AutoSortingManager(@Nonnull Survival plugin, @Nonnull String configName) {
        this.plugin = plugin;

        this.config = new YamlConfig(configName);
        this.plugin.runSync().later(this::load, 1);
        this.plugin.getServer().getPluginManager().registerEvents(this, this.plugin);
        this.startTimerShowInfo();
    }

    private void startTimerShowInfo() {
        this.plugin.getServer().getScheduler().runTaskTimer(this.plugin, () -> {
            Bukkit.getOnlinePlayers().forEach(player -> {
                boolean modeDelete = this.modeDelete.containsKey(player);
                boolean allChests = this.playersShowChestSystem.containsKey(player);
                boolean modifyChests = this.chestsWaitConsumer.containsKey(player)
                        || this.chestsWaitRemoveConsumer.containsKey(player)
                        || this.chestsWaitProducer.containsKey(player)
                        || this.chestsAddCopyParameters.containsKey(player);

                TextColor modeDeleteColor = TextColor.fromHexString("#ff0000");
                TextColor allChestsColor = TextColor.fromHexString("#ff9900");
                TextColor modifyChestsColor = TextColor.fromHexString("#0055ff");

                if (modeDelete) {
                    player.sendActionBar(Component.text("Вы в режиме ").color(Survival.INFO_COLOR).append(Component.text("удаления связей").color(modeDeleteColor)));
                } else if (allChests) {
                    if (modifyChests) {
                        player.sendActionBar(
                                Component.text("Вы в режимах ").color(Survival.INFO_COLOR)
                                        .append(Component.text("изменения связей").color(modifyChestsColor)
                                                .append(Component.text(" и").color(Survival.INFO_COLOR).append(Component.text(" просмотра системы сундуков").color(allChestsColor)))));
                    } else {
                        player.sendActionBar(Component.text("Вы в режиме ").color(Survival.INFO_COLOR).append(Component.text("просмотра системы сундуков").color(allChestsColor)));
                    }
                } else if (modifyChests) {
                    player.sendActionBar(Component.text("Вы в режиме ").color(Survival.INFO_COLOR).append(Component.text("изменения связей").color(modifyChestsColor)));
                }
            });
            this.modeDelete.keySet().forEach(
                    player -> this.chestSystemPartSet.forEach(
                            chestSystemPart -> chestSystemPart.showChestStatus(plugin, player)));
            this.playersShowChestSystem.keySet().forEach(
                    player -> {
                        if (this.modeDelete.containsKey(player)) return;
                        this.chestSystemPartSet.forEach(
                                chestSystemPart -> chestSystemPart.showChestStatus(plugin, player));
                    });
            this.chestsWaitProducer.forEach((
                    (player, chestSystemPart) -> chestSystemPart.showAddProducerChests(plugin, player)));
            this.chestsWaitConsumer.forEach((
                    (player, chestSystemPart) -> chestSystemPart.showAddConsumerChests(plugin, player)));
            this.chestsWaitRemoveConsumer.forEach(
                    (player, chestSystemPart) -> chestSystemPart.showAddConsumerChests(plugin, player));
            this.chestsAddCopyParameters.forEach(
                    (player, chestSystemPart) -> chestSystemPart.showWhoCopyThisChest(plugin, player));
            ArrayList<Chunk> toRemove = new ArrayList<>();
            this.loadedChunks.forEach((chunk, aLong) -> {
                if (System.currentTimeMillis() - aLong <= MAX_TIME_LIVE_CHUNK_MS) return;
                toRemove.add(chunk);
            });
            toRemove.forEach(this.loadedChunks::remove);
        }, 0, 15);
    }

    public void removeAllActionWith(@NotNull ChestSystemPart chestSystemPart) {
        this.removeActionFrom(this.chestsWaitConsumer, chestSystemPart);
        this.removeActionFrom(this.chestsAddCopyParameters, chestSystemPart);
        this.removeActionFrom(this.chestsWaitProducer, chestSystemPart);
        this.removeActionFrom(this.chestsWaitRemoveConsumer, chestSystemPart);
        this.removeActionFrom(this.modeDelete, chestSystemPart);
        this.removeActionFrom(this.playersShowChestSystem, chestSystemPart);
    }

    private void removeActionFrom(@NotNull Map<Player, ChestSystemPart> actionChest, @NotNull ChestSystemPart chestSystemPart) {
        for (Map.Entry<Player, ChestSystemPart> entry : actionChest.entrySet()) {
            if (!entry.getValue().equals(chestSystemPart)) continue;
            actionChest.remove(entry.getKey());
            break;
        }
    }

    @EventHandler
    private void click(PlayerInteractEvent event) {
        Player player = event.getPlayer();
        ItemStack itemInHand = player.getEquipment().getItemInMainHand();
        if (this.tryManipulationsSulker(event, player)) return;
        if (this.tryChangeFilter(event, player)) return;
        if (!(event.getAction() == Action.RIGHT_CLICK_BLOCK
                || event.getAction() == Action.LEFT_CLICK_BLOCK)
                || event.getClickedBlock().getType() != Material.CHEST
                || itemInHand.getType() != Material.AIR
                || !player.isSneaking()) return;

        if (this.nowClickPlayers.contains(player)) return;
        this.nowClickPlayers.add(player);
        this.plugin.runSync().later(() -> this.nowClickPlayers.remove(player), 1);

        event.setCancelled(true);
        if (event.getAction() == Action.RIGHT_CLICK_BLOCK) {
            Chest chest = (Chest) event.getClickedBlock().getState();
            ChestSystemPart chestSystemPart = this.getOrCreateChestSystemPart(chest);
            if (chestSystemPart == null) return;
            if (this.tryAddCopyChest(chestSystemPart, player)) return;
            if (this.tryRemoveChest(chestSystemPart, player, chest.getLocation())) return;
            if (this.tryAddConsumer(chestSystemPart, player)) return;
            if (this.tryAddProducer(chestSystemPart, player)) return;
            if (this.tryRemoveConsumer(chestSystemPart, player)) return;
            new SettingsChestSystemPart(this.plugin, player, chestSystemPart).open(player);
            return;
        }
        if (event.getAction() == Action.LEFT_CLICK_BLOCK) {
            Chest chest = (Chest) event.getClickedBlock().getState();
            ChestSystemPart chestSystemPart = this.getChestSystemPart(chest);
            if (chestSystemPart == null) return;
            new SettingsFilter(plugin, player, chestSystemPart, null).open(player);
        }
    }

    private boolean tryManipulationsSulker(PlayerInteractEvent event, Player player) {
        ItemStack itemInHand = player.getEquipment().getItemInMainHand();
        if (event.getAction() == Action.LEFT_CLICK_BLOCK
                && event.getClickedBlock().getType() == Material.CHEST
                && itemInHand.getItemMeta() instanceof BlockStateMeta blockStateMeta
                && blockStateMeta.getBlockState() instanceof ShulkerBox shulkerBox
                && player.isSneaking()) {
            Chest chest = (Chest) event.getClickedBlock().getState();
            ChestSystemPart chestSystemPart = this.getChestSystemPart(chest);
            if (chestSystemPart == null) return true;
            event.setCancelled(true);

            Inventory shulkerInventory = shulkerBox.getInventory();
            Inventory chestInventory = chest.getInventory();

            Inventory inventoryFrom = shulkerInventory;
            Inventory inventoryTo = chestInventory;

            if (shulkerInventory.isEmpty()) {
                inventoryFrom = chestInventory;
                inventoryTo = shulkerInventory;
            }
            ChestSystemPart.moveItemsFromInvToInv(inventoryFrom, inventoryTo, false);
            chestSystemPart.touchChest(plugin);

            blockStateMeta.setBlockState(shulkerBox);
            itemInHand.setItemMeta(blockStateMeta);

            player.sendMessage(
                    Component.text("Предметы перемещены")
                            .color(Survival.ON_COLOR));
            return true;
        }
        return false;
    }

    private boolean tryChangeFilter(@Nonnull PlayerInteractEvent event, @Nonnull Player player) {
        if (event.getAction() == Action.LEFT_CLICK_BLOCK
                && event.getClickedBlock().getType() == Material.CHEST
                && player.getInventory().getItemInMainHand().getType() != Material.AIR
                && player.isSneaking()) {
            Chest chest = (Chest) event.getClickedBlock().getState();
            ChestSystemPart chestSystemPart = this.getChestSystemPart(chest);
            if (chestSystemPart == null) return true;
            event.setCancelled(true);
            ItemStack addItem = player.getInventory().getItemInMainHand();
            if (addItem.getType().equals(Material.COAL)) {
                if (chestSystemPart.isFiltered()) {
                    chestSystemPart.setFiltered(false);
                    chestSystemPart.touchChest(plugin);
                    player.sendMessage(Component.text("Вы отключили фильтр").color(Survival.OFF_COLOR));
                } else {
                    player.sendMessage(Component.text("Вы включили фильтр").color(Survival.ON_COLOR));
                    chestSystemPart.setFiltered(true);
                }
                return true;
            }
            if (chestSystemPart.addFilterItemStack(plugin, addItem)) {
                player.sendMessage(
                        Component.text("Вы добавили в фильтр ")
                                .color(Survival.ON_COLOR)
                                .append(Component.translatable(addItem)
                                        .color(Survival.WARN_COLOR)));
                return true;
            }
            if (chestSystemPart.removeFilterItemStack(addItem)) {
                player.sendMessage(
                        Component.text("Вы убрали из фильтра ")
                                .color(Survival.OFF_COLOR).append(
                                        Component.translatable(addItem).color(Survival.WARN_COLOR)));
                return true;
            }
            player.sendMessage(
                    Component.text("Фильтр уже полный")
                            .color(Survival.WARN_COLOR));
            return true;
        }
        return false;
    }

    @EventHandler
    private void changeChest(BlockPlaceEvent event) {
        this.plugin.runSync().later(() -> {
            if (!(event.getBlock().getState() instanceof InventoryHolder inventoryHolder)) return;
            if (!(inventoryHolder.getInventory() instanceof DoubleChestInventory doubleChestInventory)) return;
            Location rightLocation = doubleChestInventory.getRightSide().getLocation();
            Location leftLocation = doubleChestInventory.getLeftSide().getLocation();
            if (rightLocation == null || leftLocation == null) return;
            ChestSystemPart chestSystemPart = this.getChestSystemPart(rightLocation);

            if (chestSystemPart == null) chestSystemPart = this.getChestSystemPart(leftLocation);
            if (chestSystemPart == null) return;

            chestSystemPart.changeMainLocation(plugin, rightLocation, leftLocation);
        }, 1);
    }

    @EventHandler
    private void on(BlockBreakEvent event) {
        Player player = event.getPlayer();
        if (!(event.getBlock().getState() instanceof InventoryHolder inventoryHolder)) return;
        this.isTouchChestSystem(inventoryHolder.getInventory(), chestSystemPart -> {
            ChestSystemPart.Result result = chestSystemPart.removeChestFromThis(this.plugin, event.getBlock().getLocation());
            switch (result) {
                case REMOVE_CHEST -> player.sendMessage(Component.text("Сундук отвязан").color(Survival.INFO_COLOR));
                case DELETE -> player.sendMessage(Component.text("Сундук удален").color(Survival.WARN_COLOR));
                case NOT_CONTAINS -> player.sendMessage(Component.text("Ошибка удаления").color(Survival.WARN_COLOR));
            }
        }, true, chestSystemPart -> {
            event.getBlock().breakNaturally();
            if (chestSystemPart == null) return;
            chestSystemPart.updateInventories(plugin);
        });
        event.setCancelled(true);
    }

    @EventHandler
    private void on(InventoryInteractEvent event) {
        this.isTouchChestSystem(event.getInventory(), (chestSystemPart) -> chestSystemPart.touchChest(plugin), false);
    }

    @EventHandler
    private void on(InventoryClickEvent event) {
        this.isTouchChestSystem(event.getInventory(), (chestSystemPart) -> chestSystemPart.touchChest(plugin), false);
    }

    @EventHandler
    private void on(InventoryMoveItemEvent event) {
        this.isTouchChestSystem(event.getDestination(), (chestSystemPart) -> chestSystemPart.touchChest(plugin), false);
    }

    private void isTouchChestSystem(@Nonnull Inventory inventory, Consumer<ChestSystemPart> consumer, boolean sync) {
        this.isTouchChestSystem(inventory, consumer, sync, !sync, null);
    }

    private void isTouchChestSystem(@Nonnull Inventory inventory, Consumer<ChestSystemPart> consumer, boolean sync, Consumer<ChestSystemPart> runAnyWay) {
        this.isTouchChestSystem(inventory, consumer, sync, !sync, runAnyWay);
    }

    private void isTouchChestSystem(@Nonnull Inventory inventory, Consumer<ChestSystemPart> consumer, boolean sync, boolean isLater, @Nullable Consumer<ChestSystemPart> runAnyWay) {
        InventoryHolder inventoryHolder = inventory.getHolder();

        Runnable runnable = () -> {
            if (inventoryHolder == null) {
                if (runAnyWay != null) runAnyWay.accept(null);
                return;
            }
            for (ChestSystemPart chestSystemPart : this.chestSystemPartSet) {
                if (!chestSystemPart.equals(this.getChestSystemPart(inventoryHolder))) continue;
                Runnable task = () -> {
                    consumer.accept(chestSystemPart);
                    if (runAnyWay != null) runAnyWay.accept(chestSystemPart);
                };
                if (isLater) {
                    this.plugin.runSync().later(task, 10);
                    return;
                }
                this.plugin.runSync().task(task);
                return;
            }
            if (runAnyWay != null) runAnyWay.accept(null);
        };

        if (!sync) {
            this.plugin.runAsync().task(runnable);
            return;
        }
        this.plugin.runSync().task(runnable);
    }

    private boolean tryRemoveChest(@Nonnull ChestSystemPart chestSystemPart, @Nonnull Player player, @Nonnull Location location) {
        if (!this.modeDelete.containsKey(player)) return false;
        ChestSystemPart closeModeChest = this.modeDelete.get(player);
        if (closeModeChest == chestSystemPart) {
            ChestSystemPart.Result result = closeModeChest.removeChestFromThis(this.plugin, location);
            switch (result) {
                case DELETE -> {
                    this.modeDelete.remove(player);
                    player.sendMessage(Component.text("Сундук удален").color(Survival.WARN_COLOR));
                    player.sendMessage(Component.text("Режим удаления связей выключен").color(Survival.INFO_COLOR));
                }
                case REMOVE_CHEST -> {
                    player.sendMessage(Component.text("Сундук отвязан").color(Survival.INFO_COLOR));
                }
            }
            return true;
        }
        ChestSystemPart.Result result = chestSystemPart.removeChestFromThis(this.plugin, location);
        switch (result) {
            case DELETE -> player.sendMessage(Component.text("Сундук удален").color(Survival.WARN_COLOR));
            case REMOVE_CHEST -> player.sendMessage(Component.text("Сундук отвязан").color(Survival.INFO_COLOR));
        }
        return true;
    }

    private boolean tryAddConsumer(@Nonnull ChestSystemPart chestSystemPart, @Nonnull Player player) {
        ChestSystemPart chestSystemPart1 = this.chestsWaitConsumer.get(player);
        if (chestSystemPart1 == null) return false;
        if (chestSystemPart1 == chestSystemPart) {
            this.chestsWaitConsumer.remove(player);
            player.sendMessage(Component.text("Режим добавления потребителей выключен").color(Survival.INFO_COLOR));
            chestSystemPart1.touchChest(this.plugin);
            return true;
        }
        ChestSystemPart.Result result = chestSystemPart1.addOutChestSystemPart(this.plugin, chestSystemPart, true);
        if (result != ChestSystemPart.Result.SUCCESS) {
            player.sendMessage(Component.text("Добавление отменено, причина:").color(Survival.WARN_COLOR));
            switch (result) {
                case CYCLE ->
                        player.sendMessage(Component.text("Добавление данного потребителя приведет к зацикливанию системы").color(Survival.WARN_COLOR));
                case NOW_CONTAINS ->
                        player.sendMessage(Component.text("Этот сундук уже добавлен").color(Survival.WARN_COLOR));
            }
            return true;
        }
        player.sendMessage(Component.text("Этот сундук успешно добавлен потребителем").color(Survival.ON_COLOR));
        return true;
    }

    private boolean tryAddCopyChest(@Nonnull ChestSystemPart chestSystemPart, @Nonnull Player player) {
        ChestSystemPart chestSystemPart1 = this.chestsAddCopyParameters.get(player);
        if (chestSystemPart1 == null) return false;
        if (chestSystemPart1 == chestSystemPart) {
            this.chestsAddCopyParameters.remove(player);
            player.sendMessage(Component.text("Режим добавления настроек в другие сундуки выключен").color(Survival.INFO_COLOR));
            chestSystemPart1.touchChest(this.plugin);
            return true;
        }
        if (chestSystemPart1.addNewChestToThis(this.plugin, chestSystemPart)) {
            player.sendMessage(Component.text("Этот сундук успешно скопировал настройки").color(Survival.ON_COLOR));
            return true;
        }
        player.sendMessage(Component.text("Ошибка добавления").color(Survival.WARN_COLOR));
        return true;
    }

    private boolean tryAddProducer(@Nonnull ChestSystemPart chestSystemPart, @Nonnull Player player) {
        ChestSystemPart chestSystemPart1 = this.chestsWaitProducer.get(player);
        if (chestSystemPart1 == null) return false;
        if (chestSystemPart1 == chestSystemPart) {
            this.chestsWaitProducer.remove(player);
            player.sendMessage(Component.text("Режим добавления спонсоров выключен").color(Survival.INFO_COLOR));
            chestSystemPart1.touchChest(this.plugin);
            return true;
        }
        ChestSystemPart.Result result = chestSystemPart.addOutChestSystemPart(this.plugin, chestSystemPart1, true);
        if (result != ChestSystemPart.Result.SUCCESS) {
            player.sendMessage(Component.text("Добавление отменено, причина:").color(Survival.WARN_COLOR));
            switch (result) {
                case CYCLE ->
                        player.sendMessage(Component.text("Добавление данного потребителя приведет к зацикливанию системы").color(Survival.WARN_COLOR));
                case NOW_CONTAINS ->
                        player.sendMessage(Component.text("Этот сундук уже добавлен").color(Survival.WARN_COLOR));
            }
            return true;
        }
        player.sendMessage(Component.text("Этот сундук успешно добавлен в качестве спонсора").color(Survival.ON_COLOR));
        return true;
    }

    private boolean tryRemoveConsumer(@Nonnull ChestSystemPart chestSystemPart, @Nonnull Player player) {
        ChestSystemPart chestSystemPart1 = this.chestsWaitRemoveConsumer.get(player);
        if (chestSystemPart1 == null) return false;
        if (chestSystemPart1 == chestSystemPart) {
            this.chestsWaitRemoveConsumer.remove(player);
            player.sendMessage(Component.text("Режим удаления потребителей выключен").color(Survival.INFO_COLOR));
            return true;
        }
        ChestSystemPart.Result result = chestSystemPart1.removeOutChestSystemPart(chestSystemPart);
        if (result != ChestSystemPart.Result.SUCCESS) {
            player.sendMessage(Component.text("Этот сундук не является потребителем настраиваемого сундука").color(Survival.WARN_COLOR));
            return true;
        }
        player.sendMessage(Component.text("Этот сундук успешно удален из потребителей").color(Survival.ON_COLOR));
        return true;
    }

    @Nullable
    private ChestSystemPart getOrCreateChestSystemPart(@Nonnull Chest chest) {
        ChestSystemPart chestSystemPart = getChestSystemPart(chest);
        if (chestSystemPart != null) return chestSystemPart;
        Location location = this.getLocation(chest);
        if (location == null) return null;
        chestSystemPart = new ChestSystemPart(this.plugin, location);
        this.chestSystemPartSet.add(chestSystemPart);
        return chestSystemPart;
    }

    @Nullable
    public ChestSystemPart getChestSystemPart(@Nonnull InventoryHolder inventoryHolder) {
        Location location = this.getLocation(inventoryHolder);
        if (location == null) return null;
        return this.getChestSystemPart(location);
    }

    @Nullable
    public ChestSystemPart getChestSystemPart(@Nonnull Location location) {
        for (ChestSystemPart chestSystemPart : this.chestSystemPartSet) {
            if (!chestSystemPart.getLocationContainer().contains(location)) continue;
            return chestSystemPart;
        }
        return null;
    }

    @Nullable
    public Location getLocation(@Nonnull InventoryHolder inventoryHolder) {
        if (inventoryHolder.getInventory() instanceof DoubleChestInventory doubleChestInventory) {
            return doubleChestInventory.getLeftSide().getLocation();
        }
        return inventoryHolder.getInventory().getLocation();
    }

    private void save() {
        this.config.config.getKeys(false).forEach(key -> this.config.config.set(key, null));
        int count = 0;
        for (ChestSystemPart chestSystemPart : this.chestSystemPartSet) {
            ConfigurationSection section = this.config.config.createSection(count++ + "");
            section.set("priority", chestSystemPart.getPriority());
            section.set("filtered", chestSystemPart.isFiltered());

            int countLocation = 0;
            for (Location location : chestSystemPart.getLocationContainer()) {
                if (location == null) continue;
                section.set("locations." + countLocation++, location);
            }

            int countItem = 0;
            for (ItemStack itemStack : chestSystemPart.getFilter()) {
                if (itemStack == null) continue;
                section.set("filter." + countItem++, itemStack);
            }
            int countInPut = -1;
            for (ChestSystemPart chestSystemPart1 : chestSystemPart.getInPut()) {
                countInPut++;
                int countLocations = 0;
                for (Location location : chestSystemPart1.getLocationContainer()) {
                    section.set("inPut." + countInPut + ".locations." + countLocations++, location);
                }
            }

            int countOutPut = -1;
            for (Set<ChestSystemPart> outPuts : chestSystemPart.getOutPutByPriority().values()) {
                for (ChestSystemPart chestSystemPart1 : outPuts) {
                    countOutPut++;
                    int countLocations = 0;
                    for (Location location : chestSystemPart1.getLocationContainer()) {
                        section.set("outPut." + countOutPut + ".locations." + countLocations++, location);
                    }
                }
            }
        }
        this.config.save();
    }

    private void load() {
        this.config.config.getKeys(false).forEach(key -> {
            ConfigurationSection section = this.config.config.getConfigurationSection(key);
            if (section == null) return;

            ChestSystemPart chestSystemPart = this.loadChestSystemPart(section, "locations");
            if (chestSystemPart == null) return;

            chestSystemPart.setPriority(section.getInt("priority"));
            chestSystemPart.setFiltered(section.getBoolean("filtered"));

            ConfigurationSection filterSection = section.getConfigurationSection("filter");
            if (filterSection != null) {
                filterSection.getKeys(false).forEach(
                        keyFilter -> chestSystemPart.addFilterItemStack(
                                this.plugin,
                                Objects.requireNonNull(filterSection.getItemStack(keyFilter)), false));
            }

            ConfigurationSection inPutSection = section.getConfigurationSection("inPut");
            if (inPutSection != null) {
                inPutSection.getKeys(false).forEach(
                        keyInPut -> {
                            ConfigurationSection inPutLocationsSection = inPutSection.getConfigurationSection(keyInPut);
                            if (inPutLocationsSection == null) return;
                            ChestSystemPart chestSystemPart1 = this.loadChestSystemPart(inPutLocationsSection, "locations");
                            if (chestSystemPart1 == null) return;
                            chestSystemPart.getInPut().add(chestSystemPart1);
                        });
            }

            ConfigurationSection outPutSection = section.getConfigurationSection("outPut");
            if (outPutSection != null) {
                outPutSection.getKeys(false).forEach(
                        keyOutPut -> {
                            ConfigurationSection inPutLocationsSection = outPutSection.getConfigurationSection(keyOutPut);
                            if (inPutLocationsSection == null) return;
                            ChestSystemPart chestSystemPart1 = this.loadChestSystemPart(inPutLocationsSection, "locations");
                            if (chestSystemPart1 == null) return;
                            chestSystemPart.addOutChestSystemPart(this.plugin, chestSystemPart1, false);
                        });
            }

            this.chestSystemPartSet.add(chestSystemPart);
        });
        this.chestSystemPartSet.forEach(chestSystemPart -> chestSystemPart.updateCountAllMaterials(this.plugin));
    }

    @Nullable
    private ChestSystemPart loadChestSystemPart(@NotNull ConfigurationSection section, @NotNull String keySection) {
        ConfigurationSection locationsSection = section.getConfigurationSection(keySection);
        ChestSystemPart processedChestSystemPart = null;
        if (locationsSection == null) return null;
        for (String keyLocation : locationsSection.getKeys(false)) {
            Location location = locationsSection.getLocation(keyLocation);
            if (!(location.getBlock().getState() instanceof Chest chest)) continue;
            if (processedChestSystemPart == null) {
                processedChestSystemPart = this.getOrCreateChestSystemPart(chest);
                continue;
            }
            ChestSystemPart secondaryChestSystemPart = this.getOrCreateChestSystemPart(chest);
            if (secondaryChestSystemPart == null) continue;
            processedChestSystemPart.addNewChestToThis(this.plugin, secondaryChestSystemPart);
        }
        if (processedChestSystemPart == null) return null;

        return processedChestSystemPart;
    }

    @Override
    public void unloadManager() {
        this.save();
    }
}
