package castroproject.survival.commands;

import castroproject.common.Manager;
import castroproject.common.utils.YamlConfig;
import castroproject.survival.Survival;
import castroproject.survival.worldincidents.TeleportEvent;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.World;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Player;

import javax.annotation.Nonnull;
import java.util.Objects;

public class CommandSpawnManager implements Manager {
    private final Survival plugin;
    private final YamlConfig config;
    private final String[] teleportMessage = new String[]{
            //"Свалил нахуй",
            "Андрюха позволил тебе это сделать, и ты сделал",
            "Телепорт сквозь пространство",
            "ah, shit, here we go again",
            "Военком не найдет",
            //"Ебать доктор стрэндж",
            "В следующий раз расщепит на атомы",
            //"Ебанный волшебник",
            //"А нахуя человечество придумало самолет",
            //"Лошадь: Ну да, ну да, пошла я нахуй",
            "Такой функции даже у Путина нет"
    };

    public CommandSpawnManager(@Nonnull Survival plugin, @Nonnull String fileName) {
        this.plugin = plugin;
        this.config = new YamlConfig(fileName);

        World world = Bukkit.getWorld("world");
        Location loc = new Location(world,
                26,
                69,
                65);
        assert world != null;
        world.getWorldBorder().setCenter(loc);
        world.getWorldBorder().setSize(30000000);

        World worldNether = Bukkit.getWorld("world_nether");
        Location locNether = new Location(worldNether,
                0,
                0,
                0);
        assert worldNether != null;
        worldNether.getWorldBorder().setCenter(locNether);
        worldNether.getWorldBorder().setSize(30000000);
    }

    public void command(@Nonnull Player player, @Nonnull String[] args) {
        if (args.length != 0 && !player.isOp()) {
            player.sendMessage("Андрей запретил тебе это делать");
            return;
        }
        if (args.length == 0) {
            assert this.config.config != null;
            if (!this.config.config.contains("world")) {
                player.sendMessage("Попросите Андрея установить спавн, /spawn set");
                return;
            }
            YamlConfiguration spawnConfig = this.config.config;
            Location spawn = new Location(
                    Bukkit.getWorld(Objects.requireNonNull(spawnConfig.getString("world"))),
                    spawnConfig.getDouble("x"),
                    spawnConfig.getDouble("y"),
                    spawnConfig.getDouble("z"),
                    (float) spawnConfig.getDouble("yaw"),
                    (float) spawnConfig.getDouble("pitch"));
            this.plugin.get(TeleportEvent.class).teleport(player, spawn);
            player.sendMessage(this.teleportMessage[(int) (Math.random() * this.teleportMessage.length)]);
            return ;
        }
        if (args.length == 1 && args[0].equals("set")) {
            Location spawn = player.getLocation();
            YamlConfiguration spawnConfig = this.config.config;
            spawnConfig.set("world", spawn.getWorld().getName());
            spawnConfig.set("x", spawn.getX());
            spawnConfig.set("y", spawn.getY());
            spawnConfig.set("z", spawn.getZ());
            spawnConfig.set("yaw", spawn.getYaw());
            spawnConfig.set("pitch", spawn.getPitch());
            player.sendMessage("Ты установил спавн, теперь юзай /spawn");
            this.config.save();
        }
    }
}
