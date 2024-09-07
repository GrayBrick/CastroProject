package castroproject.survival.worldincidents;

import castroproject.common.Manager;
import castroproject.survival.Survival;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.event.ClickEvent;
import net.kyori.adventure.text.event.HoverEvent;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.inventory.EquipmentSlot;
import org.bukkit.inventory.ItemStack;
import org.jetbrains.annotations.NotNull;

import java.text.DecimalFormat;
import java.util.HashMap;

public class InfoManager implements Manager {
    private final Survival plugin;
    private final int updatePeriodTick = 5;
    private final DecimalFormat format = new DecimalFormat("0.0");
    private final HashMap<Player, Location> prevLocations = new HashMap<>();

    public InfoManager(@NotNull Survival plugin) {
        this.plugin = plugin;
        this.timer();
    }

    public void timer() {
        this.plugin.getLogger().info("SpeedTimer Start");
        this.speedTimer();
        this.discordTimer();
    }

    private void discordTimer() {
        this.plugin.runSync().timer(() -> {
            Bukkit.getOnlinePlayers().forEach(this::sendInfoDiscord);
        }, 0, 20 * 60 * 10);
    }

    public void sendInfoDiscord(Player player) {
        player.sendMessage(Component
                .text("Кто не в дискорде, того кик")
                .color(Survival.WARN_COLOR)
                .hoverEvent(
                        HoverEvent.showText(Component
                                .text("Нажал быстро")
                                .color(Survival.INFO_COLOR)))
                .clickEvent(ClickEvent.openUrl(
                        "https://discord.gg/pj8ftmJXgu"
                ))
                .append(Component
                        .text("\n*клик*")
                        .color(Survival.INFO_COLOR)));
    }

    private void speedTimer() {
        this.plugin.runSync().timer(() -> {
            Bukkit.getOnlinePlayers().forEach(player -> {
                Location prevLocation = this.prevLocations.get(player);
                if (prevLocation == null) {
                    this.prevLocations.put(player, player.getLocation());
                    return;
                }
                ItemStack itemInHand = player.getInventory().getItem(EquipmentSlot.HAND);
                if (!itemInHand.getType().equals(Material.COMPASS)) return;
                Location location = player.getLocation();
                if (!location.getWorld().equals(prevLocation.getWorld())) return;
                double distance = location.distance(prevLocation);
                double speedMeterPerSec = distance / (this.updatePeriodTick / 20.0);
                double speedKmPerH = speedMeterPerSec * 3.6;
                Component message = Component.text(format.format(speedKmPerH)).color(Survival.WARN_COLOR)
                        .append(Component.text(" км/ч").color(Survival.INFO_COLOR));
                player.sendActionBar(message);
                this.prevLocations.put(player, player.getLocation());
            });
        }, 0, this.updatePeriodTick);
    }
}
