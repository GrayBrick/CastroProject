package castroproject.survival.worldincidents;

import castroproject.common.Manager;
import castroproject.survival.Survival;
import org.bukkit.Location;
import org.bukkit.entity.*;
import org.bukkit.entity.memory.MemoryKey;
import org.checkerframework.checker.units.qual.N;

import javax.annotation.Nonnull;

public class TeleportEvent implements Manager {
    private final Survival plugin;

    public TeleportEvent(@Nonnull Survival plugin) {
        this.plugin = plugin;
    }

    public void teleport(@Nonnull Player player, @Nonnull Location location) {
        for (Entity entity : player.getNearbyEntities(10, 10, 10)) {
            if (!(entity instanceof Allay allay)) continue;
            if (!allay.getMemory(MemoryKey.LIKED_PLAYER).equals(player.getUniqueId())) continue;
            if (allay.isLeashed()) continue;
            allay.teleport(location);
        }
        for (Entity entity : player.getNearbyEntities(10, 10, 10)) {
            if (!(entity instanceof Wolf wolf)) continue;
            AnimalTamer owner = wolf.getOwner();
            if (owner == null) continue;
            if (!owner.getUniqueId().equals(player.getUniqueId())) continue;
            if (wolf.isSitting()) continue;
            if (wolf.isLeashed()) continue;
            wolf.teleport(location);
        }
        for (Entity entity : player.getNearbyEntities(10, 10, 10)) {
            if (!(entity instanceof Cat cat)) continue;
            AnimalTamer owner = cat.getOwner();
            if (owner == null) continue;
            if (!owner.getUniqueId().equals(player.getUniqueId())) continue;
            if (cat.isSitting()) continue;
            if (cat.isLeashed()) continue;
            cat.teleport(location);
        }
        for (Entity entity : player.getNearbyEntities(10, 10, 10)) {
            if (!(entity instanceof Fox fox)) continue;
            AnimalTamer owner = fox.getFirstTrustedPlayer();
            if (owner == null) continue;
            if (!owner.getUniqueId().equals(player.getUniqueId())) continue;
            if (fox.isLeashed()) continue;
            fox.teleport(location);
        }
        player.teleport(location);
    }
}
