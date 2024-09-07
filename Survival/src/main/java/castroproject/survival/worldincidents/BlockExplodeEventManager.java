package castroproject.survival.worldincidents;

import castroproject.common.Manager;
import castroproject.survival.Survival;
import io.papermc.paper.event.entity.EntityMoveEvent;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.entity.Arrow;
import org.bukkit.entity.Player;
import org.bukkit.entity.TNTPrimed;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockExplodeEvent;
import org.bukkit.event.block.TNTPrimeEvent;
import org.bukkit.event.entity.EntityExplodeEvent;
import org.bukkit.event.entity.EntitySpawnEvent;
import org.jetbrains.annotations.NotNull;

import javax.swing.text.html.HTMLDocument;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;

public class BlockExplodeEventManager implements Manager, Listener {
    private final Survival plugin;
    private final HashSet<TNTPrimed> tnts = new HashSet<>();

    public BlockExplodeEventManager(@NotNull Survival plugin) {
        this.plugin = plugin;
        Bukkit.getPluginManager().registerEvents(this, this.plugin);
        plugin.runSync().timer(() -> {
            Iterator<TNTPrimed> iter = tnts.iterator();
            while (iter.hasNext()) {
                TNTPrimed tntPrimed = iter.next();
                if (tntPrimed.getLocation().getBlockY() > 67) continue;
                for (int x = -3; x < 3; x++) {
                    for (int y = 0; y < 3; y++) {
                        for (int z = -3; z < 3; z++) {
                            Location location = new Location(
                                    tntPrimed.getWorld(),
                                    tntPrimed.getLocation().getBlockX() + x,
                                    tntPrimed.getLocation().getBlockY() + y,
                                    tntPrimed.getLocation().getBlockZ() + z);
                            if (Material.AIR.equals(location.getBlock().getType())) continue;
                            tntPrimed.setFuseTicks(0);
                        }
                    }
                }
            }
        }, 0, 1);
    }

    @EventHandler
    public void blockExplode(EntityExplodeEvent event) {
        if (!(event.getEntity() instanceof TNTPrimed tntPrimed)) return;
        float sizeExplode = tntPrimed.getYield() * 4;
        for (int x = (int) -sizeExplode; x < sizeExplode; x++) {
            for (int y = (int) -sizeExplode; y < sizeExplode; y++) {
                for (int z = (int) -sizeExplode; z < sizeExplode; z++) {
                    Location location = new Location(
                            tntPrimed.getWorld(),
                            tntPrimed.getLocation().getBlockX() + x,
                            tntPrimed.getLocation().getBlockY() + y,
                            tntPrimed.getLocation().getBlockZ() + z);
                    if (!Material.WATER.equals(location.getBlock().getType()) && !Material.LAVA.equals(location.getBlock().getType()))
                        continue;
                    location.getBlock().setType(Material.AIR);
                }
            }
        }
    }

    @EventHandler
    public void tNTPrimeEvent(EntitySpawnEvent event) {
        if (!(event.getEntity() instanceof TNTPrimed tntPrimed)) return;
        tntPrimed.setFuseTicks(200);
        tnts.add(tntPrimed);
    }
}
