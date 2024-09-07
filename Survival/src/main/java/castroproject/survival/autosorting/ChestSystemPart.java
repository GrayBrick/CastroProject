package castroproject.survival.autosorting;

import castroproject.common.BukkitPlugin;
import castroproject.common.utils.InventoryUtils;
import com.destroystokyo.paper.ParticleBuilder;
import org.bukkit.*;
import org.bukkit.block.ShulkerBox;
import org.bukkit.entity.Player;
import org.bukkit.inventory.*;
import org.bukkit.inventory.meta.BlockStateMeta;
import org.checkerframework.checker.units.qual.A;
import org.jetbrains.annotations.NotNull;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import java.util.function.UnaryOperator;

public class ChestSystemPart {
    public final static int MAX_ITEMS_IN_FILTER = 45;
    public final static int DEFAULT_PRIORITY = 4;

    public final static int MAX_DISTANCE_SHOW_PARTICLE = 10;
    private final static Color MAIN_CHEST_COLOR = Color.fromRGB(255, 0, 0);
    private final static Color SECONDARY_CHEST_COLOR = Color.fromRGB(255, 251, 0);

    private final static Color PRODUCER_CHEST_COLOR = Color.fromRGB(255, 255, 255);
    ;
    private final static Color ALL_CHEST_COLOR = Color.fromRGB(0, 170, 255);
    private final static Color CONSUMER_CHEST_COLOR = Color.fromRGB(0, 34, 255);
    private final static Color SINGLE_CHEST_COLOR = Color.fromRGB(0, 0, 0);

    private final Set<Location> locationsContainer = new HashSet<>();
    private final Map<Integer, Set<ChestSystemPart>> outPutByPriority = new HashMap<>();
    private final Set<ChestSystemPart> inPut = new HashSet<>();
    private final Set<ItemStack> filter = new HashSet<>();
    private int priority = DEFAULT_PRIORITY;
    private boolean filtered = true;
    private final Map<Material, Integer> countAllMaterials = new HashMap<>();
    private final Set<Inventory> inventories = new HashSet<>();

    public enum Result {
        SUCCESS,
        CYCLE,
        NOT_CONTAINS,
        NOW_CONTAINS,
        REMOVE_CHEST,
        DELETE
    }

    public Map<Integer, Set<ChestSystemPart>> getOutPutByPriority() {
        return this.outPutByPriority;
    }

    public Set<ChestSystemPart> getInPut() {
        return this.inPut;
    }

    public ChestSystemPart(@NotNull BukkitPlugin plugin, @Nonnull Location locationContainer) {
        this.locationsContainer.add(locationContainer);
        this.updateInventories(plugin);
    }
    public void changeMainLocation(@NotNull BukkitPlugin plugin, @NotNull Location rightLocation, @NotNull Location leftLocation) {
        this.locationsContainer.remove(rightLocation);
        this.locationsContainer.add(leftLocation);
        this.updateInventories(plugin);
    }

    public Set<Location> getLocationContainer() {
        return this.locationsContainer;
    }

    public void showAddConsumerChests(@NotNull BukkitPlugin plugin, @NotNull Player player) {
        this.showChest(plugin, player, MAIN_CHEST_COLOR);
        this.getOutPutByPriority().values().forEach(
                chestSystemParts -> chestSystemParts.forEach(
                chestSystemPart -> {
            chestSystemPart.showChest(plugin, player, SECONDARY_CHEST_COLOR);
                    this.showDirection(player, chestSystemPart);
        }));
    }

    public void showWhoCopyThisChest(@NotNull BukkitPlugin plugin, @NotNull Player player) {
        this.showChest(plugin, player, MAIN_CHEST_COLOR);
    }

    public void showAddProducerChests(@NotNull BukkitPlugin plugin, @NotNull Player player) {
        this.showChest(plugin, player, MAIN_CHEST_COLOR);
        this.getInPut().forEach(chestSystemPart -> {
            chestSystemPart.showChest(plugin, player, SECONDARY_CHEST_COLOR);
            chestSystemPart.showDirection(player, this);
        });
    }

    public void showChestStatus(@NotNull BukkitPlugin plugin, @NotNull Player player) {
        Color color;
        if (this.getOutPutByPriority().isEmpty() && this.getInPut().isEmpty()) color = SINGLE_CHEST_COLOR;
        else if (this.getOutPutByPriority().isEmpty()) color = PRODUCER_CHEST_COLOR;
        else if (this.getInPut().isEmpty()) color = CONSUMER_CHEST_COLOR;
        else color = ALL_CHEST_COLOR;
        this.showChest(plugin, player, color);

        this.getOutPutByPriority().values().forEach(chestSystemParts -> chestSystemParts.forEach(chestSystemPart -> {
            this.showDirection(player, chestSystemPart);
        }));
    }

    private void showDirection(@NotNull Player player, @NotNull ChestSystemPart to) {
        this.getLocationContainer().forEach(
                locationFrom -> to.getLocationContainer().forEach(
                        locationTo -> this.showDirection(player, locationFrom, locationTo)));
    }

    private void showDirection(@NotNull Player player, @NotNull Location from, @NotNull Location to) {
        if (!from.getWorld().equals(to.getWorld())) return;
        double distance = from.distance(to);
        if (distance > 1000) return;
        if (!player.getWorld().equals(from.getWorld())) return;
        if (player.getLocation().distance(from) > MAX_DISTANCE_SHOW_PARTICLE
                && player.getLocation().distance(to) > MAX_DISTANCE_SHOW_PARTICLE) return;

        Vibration vibration = new Vibration(
                new Vibration.Destination.BlockDestination(to.clone().add(0.5, 0.5, 0.5)),
                (int) distance * 5);

        player.spawnParticle(
                Particle.VIBRATION,
                from.clone().add(0.5, 0.5, 0.5),
                1,
                vibration);
    }

    public void showChest(@NotNull BukkitPlugin plugin, @NotNull Player player, @NotNull Color color) {
        this.getInventory(plugin).forEach(inventory -> {
            if (inventory instanceof DoubleChestInventory doubleChestInventory) {
                this.showLocation(player, Objects.requireNonNull(doubleChestInventory.getLeftSide().getLocation()), color);
                this.showLocation(player, Objects.requireNonNull(doubleChestInventory.getRightSide().getLocation()), color);
                return;
            }
            this.showLocation(player, Objects.requireNonNull(inventory.getLocation()), color);
        });
    }

    private void showLocation(@NotNull Player player, @NotNull Location location, @NotNull Color color) {
        if (location.getWorld() != player.getLocation().getWorld() || location.distance(player.getLocation()) > MAX_DISTANCE_SHOW_PARTICLE)
            return;
        ParticleBuilder particleBuilder = new ParticleBuilder(Particle.REDSTONE)
                .color(color);
        int count = 2;
        float step = 0.8F;
        float startAdd = (float) ((1.0 - step * (count - 1)) / 2.0F);
        for (float x = 0F; x < step * count; x += step) {
            for (float y = 0F; y < step * count; y += step) {
                for (float z = 0F; z < step * count; z += step) {
                    if (count == 3 && x == step && y == step && z == step) continue;
                    particleBuilder.location(location.clone().add(startAdd + x, startAdd + y - 0.1, startAdd + z));
                    if (player == null) particleBuilder.allPlayers();
                    else particleBuilder.receivers(player);
                    particleBuilder.spawn();
                }
            }
        }
    }

    public void setFiltered(boolean filtered) {
        this.filtered = filtered;
    }

    public boolean isFiltered() {
        return this.filtered;
    }

    public Set<ItemStack> getFilter() {
        return this.filter;
    }

    public void delete(@NotNull BukkitPlugin plugin) {
        plugin.get(AutoSortingManager.class).removeAllActionWith(this);

        this.inPut.forEach(
                chestSystemPart -> {
                    Set<ChestSystemPart> outPut = chestSystemPart.outPutByPriority.getOrDefault(this.priority, new HashSet<>());
                    outPut.remove(this);
                    if (outPut.isEmpty()) chestSystemPart.outPutByPriority.remove(this.priority);
                    else chestSystemPart.outPutByPriority.put(this.priority, outPut);
                });
        this.outPutByPriority.forEach((priority, chestSystemParts)
                -> chestSystemParts.forEach(chestSystemPart -> chestSystemPart.inPut.remove(this)));
        Iterator<Map.Entry<Player, ChestSystemPart>> iterator = plugin.get(AutoSortingManager.class).chestsWaitConsumer.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<Player, ChestSystemPart> entry = iterator.next();
            if (!entry.getValue().equals(this)) continue;
            iterator.remove();
        }

        iterator = plugin.get(AutoSortingManager.class).chestsWaitRemoveConsumer.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<Player, ChestSystemPart> entry = iterator.next();
            if (!entry.getValue().equals(this)) continue;
            iterator.remove();
        }

        plugin.get(AutoSortingManager.class).chestSystemPartSet.remove(this);
    }

    public void touchChest(@NotNull BukkitPlugin plugin) {
        this.touchChest(plugin, -1, -1);
    }

    public void touchChest(@NotNull BukkitPlugin plugin, int countItemsToMove, int deep) {
        if (deep != 0) {
            this.getInPut().forEach(chestSystemPart -> {
                for (Inventory inventory : chestSystemPart.getInventory(plugin)) {
                    for (ItemStack itemStack : inventory.getStorageContents()) {
                        if (itemStack == null) continue;
                        if (this.isFiltered() && !this.itemIsContainsInFilter(itemStack)) continue;
                        chestSystemPart.touchChest(plugin, countItemsToMove, deep - 1);
                        return;
                    }
                }
            });
        }

        this.updateCountAllMaterials(plugin);
        this.moveItemsToPriority(plugin, true, countItemsToMove, deep);
        this.moveItemsToPriority(plugin, false, countItemsToMove, deep);
    }


    private void moveItemsToPriority(@NotNull BukkitPlugin plugin, boolean isFiltered, int countItemsToMove, int deep) {
        for (int priority = 8; priority >= 0; priority--) {
            Set<ChestSystemPart> outPut = this.getOutPutByPriority().get(priority);
            if (outPut == null) continue;
            outPut.forEach(chestSystemPart -> this.moveItems(plugin, chestSystemPart, isFiltered, countItemsToMove, deep));
        }
    }

    private void moveItems(@NotNull BukkitPlugin plugin, @NotNull ChestSystemPart chestSystemPart, boolean isFiltered, int countItemsToMove, int deep) {
        if (chestSystemPart.isFiltered() != isFiltered || countItemsToMove == 0) return;
        if (isFiltered) {
            boolean containsItemInInventories = false;
            for (ItemStack itemStack : chestSystemPart.getFilter()) {
                if (this.countAllMaterials.get(itemStack.getType()) == null) continue;
                containsItemInInventories = true;
                break;
            }
            if (!containsItemInInventories) return;
        }

        Set<Inventory> inventoriesFrom = this.getInventory(plugin);
        Set<Inventory> inventoriesTo = chestSystemPart.getInventory(plugin);
        AtomicBoolean isTouch = new AtomicBoolean(false);

        moveItemsFromInvToInv(inventoriesFrom, inventoriesTo, chestSystemPart,
                isFiltered, countItemsToMove, isTouch, true);

        if (isTouch.get()) {
            chestSystemPart.touchChest(plugin, countItemsToMove, deep);
        }
    }

    public static void moveItemsFromInvToInv(@NotNull Inventory inventoryFrom,
                                             @NotNull Inventory inventoryTo,
                                             boolean allowShulker) {
        Set<Inventory> inventoriesFrom = new HashSet<>();
        Set<Inventory> inventoriesTo = new HashSet<>();

        inventoriesFrom.add(inventoryFrom);
        inventoriesTo.add(inventoryTo);

        moveItemsFromInvToInv(inventoriesFrom, inventoriesTo, allowShulker);
    }

    public static void moveItemsFromInvToInv(@NotNull Set<Inventory> inventoriesFrom,
                                             @NotNull Set<Inventory> inventoriesTo,
                                             boolean allowShulker) {
        moveItemsFromInvToInv(inventoriesFrom, inventoriesTo, null,
                false, -1, new AtomicBoolean(true), allowShulker);
    }

    private static void moveItemsFromInvToInv(
            @NotNull Set<Inventory> inventoriesFrom,
            @NotNull Set<Inventory> inventoriesTo,
            @Nullable ChestSystemPart chestSystemPart,
            boolean isFiltered,
            int countItemsToMove,
            AtomicBoolean isTouch,
            boolean allowShulker) {
        for (Inventory inventoryFrom : inventoriesFrom) {
            if (inventoryFrom.isEmpty()) continue;
            for (Inventory inventoryTo : inventoriesTo) {
                for (ItemStack itemStack : inventoryFrom.getStorageContents()) {
                    if (itemStack == null) continue;
                    if (!allowShulker && itemStack.getItemMeta() instanceof BlockStateMeta blockStateMeta
                            && blockStateMeta.getBlockState() instanceof ShulkerBox) continue;

                    if (isFiltered
                            && chestSystemPart != null
                            && !chestSystemPart.itemIsContainsInFilter(itemStack)) continue;

                    int maxCountToAdd = Math.min(InventoryUtils.howManyItemsWillFit(inventoryTo, itemStack), itemStack.getAmount());
                    if (maxCountToAdd == 0) continue;
                    int countToAdd = countItemsToMove == -1 ? maxCountToAdd : Math.min(maxCountToAdd, countItemsToMove);
                    ItemStack itemStack1 = itemStack.clone();
                    itemStack.setAmount(itemStack.getAmount() - countToAdd);
                    itemStack1.setAmount(countToAdd);
                    inventoryTo.addItem(itemStack1);

                    isTouch.set(true);
                    if (countItemsToMove != -1) countItemsToMove -= countToAdd;
                    if (countItemsToMove == 0) break;
                }
                if (countItemsToMove == 0) break;
            }
            if (countItemsToMove == 0) break;
        }
    }

    public int moveItemsToPlayer(@NotNull BukkitPlugin plugin, @NotNull Player player, @NotNull Material type, int count) {
        PlayerInventory inventoryTo = player.getInventory();
        int howManyItemsWillFit = InventoryUtils.howManyItemsWillFit(inventoryTo, new ItemStack(type));
        if (howManyItemsWillFit < type.getMaxStackSize()) return -2;


        this.addFilterItemStack(plugin, new ItemStack(type), false);
        this.touchChest(plugin, count, 1);
        this.removeFilterItemStack(new ItemStack(type));

        if (this.countAllMaterials.get(type) == null) return -1;

        int countToAddedNow = 0;
        Set<Inventory> inventoriesFrom = this.getInventory(plugin);
        boolean isTouch = false;
        for (Inventory inventoryFrom : inventoriesFrom) {
            if (inventoryFrom.isEmpty()) continue;
            for (ItemStack itemStack : inventoryFrom.getStorageContents()) {
                if (itemStack == null) continue;
                if (!type.equals(itemStack.getType())) continue;
                int maxCountToAdd = Math.min(InventoryUtils.howManyItemsWillFit(inventoryTo, itemStack), itemStack.getAmount());
                if (maxCountToAdd == 0) continue;
                int countToAdd = Math.min(maxCountToAdd, count);
                ItemStack itemStack1 = itemStack.clone();
                itemStack.setAmount(itemStack.getAmount() - countToAdd);
                itemStack1.setAmount(countToAdd);
                inventoryTo.addItem(itemStack1);
                isTouch = true;
                count -= countToAdd;
                countToAddedNow += countToAdd;
                if (count == 0) break;
            }
            if (count == 0) break;
        }
        if (isTouch) {
            this.touchChest(plugin, count, 1);
        }
        return countToAddedNow;
    }

    public TreeMap<Material, Integer> getAllMaterialInSystemUp(@NotNull BukkitPlugin plugin, AtomicInteger countNullItem) {
        return getAllMaterialInSystemUp(plugin, countNullItem, chestSystemParts -> getUpChestsSystemPart(null));
    }

    public TreeMap<Material, Integer> getAllMaterialInSystemUp(@NotNull BukkitPlugin plugin, AtomicInteger countNullItem, @NotNull UnaryOperator<Set<ChestSystemPart>> function) {
        final TreeMap<Material, Integer> allMaterials = new TreeMap<>();
        function.apply(null).forEach(chestSystemPart -> {
            chestSystemPart.getInventory(plugin).forEach(inventory -> {
                if (inventory == null) return;
                for (ItemStack item : inventory.getStorageContents()) {
                    if (item == null) {
                        countNullItem.set(countNullItem.get() + 1);
                        continue;
                    }
                    allMaterials.put(item.getType(), allMaterials.getOrDefault(item.getType(), 0) + item.getAmount());
                }
            });
        });
        return allMaterials;
    }


    private Set<ChestSystemPart> getUpChestsSystemPart(@Nullable Set<ChestSystemPart> list) {
        if (list == null) list = new HashSet<>();
        list.add(this);
        for (ChestSystemPart chestSystemPart : this.getInPut()) {
            chestSystemPart.getUpChestsSystemPart(list);
        }
        return list;
    }

    public Set<ChestSystemPart> getNextChestSystemPart() {
        return new HashSet<>(this.getInPut());
    }

    @NotNull
    private Set<Inventory> getInventory(@NotNull BukkitPlugin plugin) {
        this.loadChunkIfNotLoaded(plugin);
        return this.inventories;
    }

    public void updateInventories(@NotNull BukkitPlugin plugin) {
        this.loadChunkIfNotLoaded(plugin);
        this.inventories.clear();
        this.locationsContainer.forEach(location -> {
            if (!(location.getBlock().getState() instanceof InventoryHolder inventoryHolder)) return;
            this.inventories.add(inventoryHolder.getInventory());
        });
    }

    private void updateInventoriesLater(@NotNull BukkitPlugin plugin) {
        plugin.runSync().later(() -> {
            this.updateInventories(plugin);
        }, 10);
    }

    private void loadChunkIfNotLoaded(@NotNull BukkitPlugin plugin) {
        Set<Chunk> loadedChunks = new HashSet<>();
        this.locationsContainer.forEach(location -> {
            if (!loadedChunks.contains(location.getChunk()) && !location.getChunk().isLoaded()) {
                location.getChunk().setForceLoaded(true);
                loadedChunks.add(location.getChunk());
            }
            if (location.getBlock().getState() instanceof InventoryHolder inventoryHolder) {
                if (!(inventoryHolder.getInventory() instanceof DoubleChestInventory doubleChestInventory)) return;
                Chunk chunkLeft = doubleChestInventory.getLeftSide().getLocation().getChunk();
                if (!loadedChunks.contains(chunkLeft) && !chunkLeft.isLoaded()) {
                    chunkLeft.setForceLoaded(true);
                    loadedChunks.add(chunkLeft);
                }
                Chunk chunkRight = doubleChestInventory.getRightSide().getLocation().getChunk();
                if (loadedChunks.contains(chunkRight) || chunkLeft.equals(chunkRight) || chunkRight.isLoaded()) return;
                chunkRight.setForceLoaded(true);
                loadedChunks.add(chunkRight);
            }
        });
    }

    public boolean addNewChestToThis(@NotNull BukkitPlugin plugin, @NotNull ChestSystemPart chestSystemPart) {
        for (Location location : this.locationsContainer) {
            for (Location location1 : chestSystemPart.locationsContainer) {
                if (location.equals(location1)) return false;
            }
        }
        this.locationsContainer.addAll(chestSystemPart.locationsContainer);
        this.updateInventories(plugin);
        chestSystemPart.delete(plugin);
        return true;
    }

    public Result removeChestFromThis(@NotNull BukkitPlugin plugin, @NotNull Location location) {
        if (!(location.getBlock().getState() instanceof InventoryHolder inventoryHolder)) return Result.NOT_CONTAINS;
        if (inventoryHolder.getInventory() instanceof DoubleChestInventory doubleChestInventory) {
            if (doubleChestInventory.getRightSide().getLocation() == null
                    || doubleChestInventory.getLeftSide().getLocation() == null) return Result.NOT_CONTAINS;
            if (location.equals(doubleChestInventory.getRightSide().getLocation())) {
                return Result.REMOVE_CHEST;
            }
            this.changeMainLocation(plugin, location, doubleChestInventory.getRightSide().getLocation());
            return Result.REMOVE_CHEST;
        }
        if (!this.locationsContainer.contains(location)) return Result.NOT_CONTAINS;
        if (this.locationsContainer.size() == 1) {
            this.delete(plugin);
            return Result.DELETE;
        }
        this.locationsContainer.remove(location);
        this.updateInventories(plugin);
        return Result.REMOVE_CHEST;
    }

    public Result addOutChestSystemPart(@NotNull BukkitPlugin plugin, @Nonnull ChestSystemPart chestSystemPart, boolean touch) {
        Set<ChestSystemPart> outPut = this.outPutByPriority.getOrDefault(chestSystemPart.priority, new HashSet<>());
        if (outPut.contains(chestSystemPart)) return Result.NOW_CONTAINS;
        outPut.add(chestSystemPart);
        if (isCycleSystemOutPut(outPut)) {
            outPut.remove(chestSystemPart);
            return Result.CYCLE;
        }
        chestSystemPart.inPut.add(this);
        this.outPutByPriority.put(chestSystemPart.priority, outPut);
        if (touch) this.touchChest(plugin);
        return Result.SUCCESS;
    }

    public Result removeOutChestSystemPart(@Nonnull ChestSystemPart chestSystemPart) {
        Set<ChestSystemPart> outPut = this.outPutByPriority.get(chestSystemPart.priority);
        if (outPut == null) return Result.NOT_CONTAINS;
        outPut.remove(chestSystemPart);
        if (chestSystemPart.inPut.remove(this)) return Result.SUCCESS;
        return Result.NOT_CONTAINS;
    }

    public int getPriority() {
        return this.priority;
    }

    public void setPriority(int newPriority) {
        if (newPriority < 0) newPriority = 0;
        if (newPriority > 8) newPriority = 8;
        int previousPriority = this.priority;
        this.priority = newPriority;
        this.inPut.forEach(chestSystemPart -> chestSystemPart.updateChestSystemPartPriority(this, previousPriority));
    }

    public boolean addFilterItemStack(@NotNull BukkitPlugin plugin, @Nonnull ItemStack itemStack) {
        return this.addFilterItemStack(plugin, itemStack, true);
    }

    public boolean addFilterItemStack(@NotNull BukkitPlugin plugin, @Nonnull ItemStack itemStack, boolean touch) {
        if (this.filter.size() >= MAX_ITEMS_IN_FILTER) return false;
        ItemStack itemToAdd = itemStack.clone();
        itemToAdd.setAmount(1);
        if (this.itemIsContainsInFilter(itemToAdd)) return false;
        this.filter.add(new ItemStack(itemToAdd.getType()));
        if (touch) this.touchChest(plugin);
        return true;
    }

    public boolean removeFilterItemStack(@Nonnull ItemStack itemStack) {
        return this.filter.removeIf(item -> item.getType() == itemStack.getType());
    }

    public boolean itemIsContainsInFilter(@Nonnull ItemStack itemStack) {
        return this.itemIsContainsInFilter(itemStack.getType());
    }

    public boolean itemIsContainsInFilter(@Nonnull Material material) {
        for (ItemStack item : this.getFilter()) {
            if (item.getType() == material) return true;
        }
        return false;
    }

    private void updateChestSystemPartPriority(@Nonnull ChestSystemPart chestSystemPart, int previousPriority) {
        Set<ChestSystemPart> outPut = this.outPutByPriority.get(previousPriority);
        if (outPut != null) outPut.remove(chestSystemPart);
        Set<ChestSystemPart> newOutPut = this.outPutByPriority.getOrDefault(chestSystemPart.priority, new HashSet<>());
        newOutPut.add(chestSystemPart);
        this.outPutByPriority.put(chestSystemPart.priority, newOutPut);
    }

    private boolean isCycleSystemOutPut(@Nonnull Set<ChestSystemPart> outPut) {
        if (outPut.contains(this)) return true;
        for (ChestSystemPart chestSystemPart : outPut) {
            for (Set<ChestSystemPart> outPuts : chestSystemPart.getOutPutByPriority().values()) {
                if (!isCycleSystemOutPut(outPuts)) continue;
                return true;
            }
        }
        return false;
    }

    public void updateCountAllMaterials(@NotNull BukkitPlugin plugin) {
        this.countAllMaterials.clear();
        this.getInventory(plugin).forEach(
                inventory -> inventory.forEach(
                        itemStack -> {
                            if (itemStack == null) return;
                            this.countAllMaterials.put(
                                    itemStack.getType(),
                                    this.countAllMaterials.getOrDefault(itemStack.getType(), 0));
                        }));
    }
}
