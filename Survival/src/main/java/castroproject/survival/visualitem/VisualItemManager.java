package castroproject.survival.visualitem;

import castroproject.common.Manager;
import castroproject.survival.Survival;
import castroproject.survival.worldincidents.InfoManager;
import io.papermc.paper.event.entity.EntityMoveEvent;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.TextColor;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Item;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.event.vehicle.VehicleEntityCollisionEvent;
import org.bukkit.inventory.ItemStack;
import org.jetbrains.annotations.NotNull;

import javax.annotation.Nonnull;
import java.util.ArrayList;

public class VisualItemManager implements Manager, Listener {
    private final Survival plugin;
    private final ArrayList<VisualItem> visualItems = new ArrayList<>();

    public VisualItemManager(@Nonnull Survival plugin) {
        this.plugin = plugin;
        this.plugin.getServer().getPluginManager().registerEvents(this, this.plugin);

        for (VisualItem visualItem : this.visualItems) {
            if (!visualItem.isCanSeeAll()) continue;
            visualItem.addPlayersWhoCanSee(Bukkit.getOnlinePlayers().toArray(new Player[]{}));
        }
    }

    public VisualItem createVisualItem(@Nonnull Location location, @Nonnull ItemStack item, @Nonnull Component name, boolean canSeeAll) {
        VisualItem visualItem = new VisualItem(this.plugin, location, item, name, canSeeAll);
        if (canSeeAll) {
            visualItem.addPlayersWhoCanSee(Bukkit.getOnlinePlayers().toArray(new Player[]{}));
        }
        this.visualItems.add(visualItem);
        visualItem.show();
        return visualItem;
    }

    @EventHandler
    private void join(PlayerJoinEvent event) {
        this.plugin.get(InfoManager.class).sendInfoDiscord(event.getPlayer());
        for (VisualItem visualItem : this.visualItems) {
            if (!visualItem.isCanSeeAll()) continue;
            visualItem.addPlayersWhoCanSee(event.getPlayer());
        }
    }

    @EventHandler
    private void quit(PlayerQuitEvent event) {
        for (VisualItem visualItem : this.visualItems) {
            if (!visualItem.isCanSeeAll()) continue;
            visualItem.removePlayersWhoCanSee(event.getPlayer());
        }
    }

    @Override
    public void unloadManager() {
        this.visualItems.forEach(VisualItem::hide);
        this.visualItems.clear();
    }
}
