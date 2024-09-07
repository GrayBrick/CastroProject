package castroproject.survival.commands;

import castroproject.common.Manager;
import castroproject.common.utils.YamlConfig;
import castroproject.survival.Survival;
import castroproject.survival.worldincidents.TeleportEvent;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Player;

import javax.annotation.Nonnull;
import java.util.Objects;

public class CommandHomeManager implements Manager {
    private final Survival plugin;
    private final YamlConfig config;
    private final String[] teleportMessage = new String[]{
            "Пяточки в тепле",
            "Домашний уют",
            "По фану home можно поставить в лаву)))",
            //"Это блять ты называешь домом?",
            //"Заведи себе собаку, хватит ебать свинью",
            //"Скоро в твой дом ебанет молния",
            //"Интересный факт, ты пидор",
            "Часто будешь юзать, к тебе приду я...",
            "Батя в здании"
    };

    public CommandHomeManager(@Nonnull Survival plugin, @Nonnull String pluginName) {
        this.plugin = plugin;
        this.config = new YamlConfig(pluginName);
    }

    public void command(@Nonnull Player player, @Nonnull String[] args) {
        if (args.length == 0) {
            assert this.config.config != null;
            ConfigurationSection configuration = this.config.config.getConfigurationSection(player.getName());
            if (configuration == null) {
                player.sendMessage("Чел, у тебя нет дома, ты бомж, но ты можешь его поставить, встань в любое место и напиши /home set, тада, дом готов");
                return;
            }
            Location home = new Location(
                    Bukkit.getWorld(Objects.requireNonNull(configuration.getString("world"))),
                    configuration.getDouble("x"),
                    configuration.getDouble("y"),
                    configuration.getDouble("z"),
                    (float) configuration.getDouble("yaw"),
                    (float) configuration.getDouble("pitch"));
            this.plugin.get(TeleportEvent.class).teleport(player, home);
            player.sendMessage(this.teleportMessage[(int) (Math.random() * this.teleportMessage.length)]);
            return ;
        }
        if (args.length == 1 && args[0].equals("set")) {
            Location spawn = player.getLocation();
            assert this.config.config != null;
            ConfigurationSection spawnConfig = this.config.config.createSection(player.getName());
            spawnConfig.set("world", spawn.getWorld().getName());
            spawnConfig.set("x", spawn.getX());
            spawnConfig.set("y", spawn.getY());
            spawnConfig.set("z", spawn.getZ());
            spawnConfig.set("yaw", spawn.getYaw());
            spawnConfig.set("pitch", spawn.getPitch());
            player.sendMessage("Опааа, ты теперь не бомж, но все равно, дом ******, а теперь попробуй написать /home, кстати, если захочешь переставить точку дома, просто напиши еще раз /home set");
            this.config.save();
        }
    }
}
