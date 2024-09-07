package castroproject.survival.skyblock;

import castroproject.common.Manager;
import castroproject.survival.Survival;
import org.bukkit.Location;
import org.bukkit.World;
import org.bukkit.WorldCreator;
import org.bukkit.WorldType;
import org.bukkit.block.Biome;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityPortalEvent;
import org.bukkit.event.player.PlayerPortalEvent;
import org.bukkit.event.player.PlayerRespawnEvent;
import org.bukkit.event.player.PlayerTeleportEvent;
import org.bukkit.generator.BlockPopulator;
import org.bukkit.generator.ChunkGenerator;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.Collections;
import java.util.List;
import java.util.Random;

public class SkyBlockManager implements Manager, Listener {
    private final Survival plugin;
    private final World world;
    private final World netherWorld;
    private final World endWorld;

    public SkyBlockManager(Survival plugin) {
        this.plugin = plugin;
        this.plugin.getServer().getPluginManager().registerEvents(this, this.plugin);

        this.world = this.generateWorld();
        this.netherWorld = this.generateNetherWorld();
        this.endWorld = this.generateEndWorld();
    }

    private World generateWorld() {
        WorldCreator worldCreator = new WorldCreator("skyBlockWorld");
        worldCreator.type(WorldType.FLAT);
        worldCreator.generateStructures(false);
        worldCreator.generator(new VoidGenerator());
        return worldCreator.createWorld();
    }

    private World generateNetherWorld() {
        WorldCreator worldCreator = new WorldCreator("skyBlockNetherWorld");
        worldCreator.type(WorldType.NORMAL);
        worldCreator.environment(World.Environment.NETHER);
        return worldCreator.createWorld();
    }

    private World generateEndWorld() {
        WorldCreator worldCreator = new WorldCreator("skyBlockEndWorld");
        worldCreator.type(WorldType.NORMAL);
        worldCreator.environment(World.Environment.THE_END);
        return worldCreator.createWorld();
    }

    public World getWorld() {
        return this.world;
    }

    public World getNetherWorld() {
        return this.netherWorld;
    }

    public World getEndWorld() {
        return this.endWorld;
    }

    @EventHandler
    private void changeWorld(PlayerPortalEvent event) {
        if (event.getCause().equals(PlayerTeleportEvent.TeleportCause.NETHER_PORTAL)) {
            World fromWorld = event.getFrom().getWorld();
            if (this.getWorld().equals(fromWorld)) {
                Location locationTo = event.getTo().clone();
                locationTo.setWorld(this.getNetherWorld());
                event.setTo(locationTo);
            } else if (this.getNetherWorld().equals(fromWorld)) {
                Location locationTo = event.getTo().clone();
                locationTo.setWorld(this.getWorld());
                event.setTo(locationTo);
            }
        }
    }

    @EventHandler
    private void death(PlayerRespawnEvent event) {
        Player player = event.getPlayer();
        World fromWorld = player.getLocation().getWorld();
        if (this.isSkyBlockWorld(fromWorld)) {
            Location respawn = player.getBedSpawnLocation();
            if (respawn == null || !this.isSkyBlockWorld(respawn.getWorld())) respawn = this.getWorld().getSpawnLocation();
            event.setRespawnLocation(respawn);
        }
    }

    private boolean isSkyBlockWorld(World world) {
        return (this.getEndWorld().equals(world) || this.getWorld().equals(world) || this.getNetherWorld().equals(world));
    }

    public static class VoidGenerator extends ChunkGenerator {
        @Override
        public @NotNull List<BlockPopulator> getDefaultPopulators(@NotNull World world) {
            return Collections.emptyList();
        }

        @SuppressWarnings("deprecation")
        @Override
        public @NotNull ChunkData generateChunkData(@NotNull World world, @NotNull Random random, int chunkX, int chunkZ, @NotNull BiomeGrid biome) {
            ChunkData chunkData = super.createChunkData(world);

            for(int x = 0; x < 16; x++) {
                for(int z = 0; z < 16; z++) {
                    biome.setBiome(x, z, Biome.PLAINS);
                }
            }

            return chunkData;
        }

        @Override
        public boolean canSpawn(@NotNull World world, int x, int z) {
            return true;
        }

        @Override
        public @Nullable Location getFixedSpawnLocation(@NotNull World world, @NotNull Random random) {
            return new Location(world, 0, 128, 0);
        }
    }
}
