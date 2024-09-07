package castroproject.survival.visualitem;

import castroproject.survival.Survival;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.TextColor;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.entity.EntityType;
import org.bukkit.entity.Item;
import org.bukkit.entity.LivingEntity;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.util.Vector;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.ArrayList;
import java.util.Arrays;

public class VisualItem {
    private final Survival plugin;
    private final Location locationItem;
    private final ItemStack item;
    private final boolean canSeeAll;
    private final Component name;
    private final ArrayList<Player> whoCanSee = new ArrayList<>();
    private Item droppedItem;

    public VisualItem(@Nonnull Survival plugin, @Nonnull Location locationItem, @Nonnull ItemStack item, @Nonnull Component name, boolean canSeeAll) {
        this.plugin = plugin;
        this.locationItem = locationItem;
        this.item = item;
        this.name = name;
        this.canSeeAll = canSeeAll;
    }

    @Nonnull
    public Location getLocationItem() {
        return this.locationItem;
    }

    @Nonnull
    public ItemStack getItem() {
        return this.item;
    }

    public boolean isCanSeeAll() {
        return this.canSeeAll;
    }

    public void addPlayersWhoCanSee(@Nonnull Player ...players) {
        this.whoCanSee.addAll(Arrays.stream(players).toList());
        if (this.droppedItem != null) {
            Arrays.stream(players).toList().forEach(
                    player -> player.showEntity(this.plugin, this.droppedItem));
        }
    }

    public void removePlayersWhoCanSee(@Nonnull Player ...players) {
        this.whoCanSee.removeAll(Arrays.stream(players).toList());
        if (this.droppedItem != null) {
            Arrays.stream(players).toList().forEach(
                    player -> player.hideEntity(this.plugin, this.droppedItem));
        }
    }

    public void show() {
        if (this.droppedItem != null) this.hide();
        this.droppedItem = (Item) this.locationItem.getWorld().spawnEntity(this.locationItem, EntityType.DROPPED_ITEM);
        this.droppedItem.setCanMobPickup(false);
        this.droppedItem.setCanPlayerPickup(false);
        this.droppedItem.setItemStack(this.item);
        this.droppedItem.setUnlimitedLifetime(true);
        this.droppedItem.setWillAge(false);
        this.droppedItem.setGravity(false);
        this.droppedItem.setInvulnerable(true);
        this.droppedItem.setPersistent(false);
        this.droppedItem.setVelocity(new Vector(0, 0, 0));
        this.droppedItem.setCustomNameVisible(true);
        this.droppedItem.customName(this.name);

        Bukkit.getOnlinePlayers().forEach(player -> player.hideEntity(this.plugin, this.droppedItem));
        this.whoCanSee.forEach(player -> player.showEntity(plugin, this.droppedItem));
    }

    public void hide() {
        if (this.droppedItem == null) return;
        this.droppedItem.remove();
        this.droppedItem = null;
    }
}
