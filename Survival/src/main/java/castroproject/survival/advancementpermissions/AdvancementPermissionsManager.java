package castroproject.survival.advancementpermissions;

import castroproject.common.Manager;
import castroproject.survival.Survival;
import castroproject.survival.worldincidents.TeleportEvent;
import com.destroystokyo.paper.event.player.PlayerArmorChangeEvent;
import io.papermc.paper.event.player.PlayerPickItemEvent;
import net.kyori.adventure.text.Component;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.OfflinePlayer;
import org.bukkit.Statistic;
import org.bukkit.advancement.Advancement;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerPortalEvent;
import org.bukkit.event.player.PlayerTeleportEvent;
import org.bukkit.inventory.ItemStack;
import org.jetbrains.annotations.NotNull;

import javax.annotation.Nonnull;
import java.awt.*;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

public class AdvancementPermissionsManager implements Manager, Listener {

    private final Survival plugin;
    private final int COUNT_ADVANCEMENT_FOR_COMPLETE = 70;

    public AdvancementPermissionsManager(@Nonnull Survival plugin) {
        this.plugin = plugin;
        this.plugin.getServer().getPluginManager().registerEvents(this, this.plugin);
    }

    private final HashMap<Player, LocalDateTime> sendMessageTimer = new HashMap<>();
    private final int SECOND_INTERVAL = 2;

    @EventHandler
    private void enderEnd(PlayerTeleportEvent event) {
        Player player = event.getPlayer();

        if (!event.getTo().getWorld().equals(Bukkit.getWorld("world_the_end"))) return;
        if (!this.plugin.get(AdvancementPermissionsManager.class).playerCompletedCondition(player)) {
            Set<Advancement> completedAdvancements = this.plugin
                    .get(AdvancementPermissionsManager.class)
                    .getCompletedAdvancements(player);

            this.sendTimerMessage(player, Component
                    .text("Зелен, иди делай ачивки, у тебя ").color(Survival.WARN_COLOR)
                    .append(Component.text(completedAdvancements.size() + " из " + this.COUNT_ADVANCEMENT_FOR_COMPLETE)
                            .color(Survival.OFF_COLOR)));
            event.setCancelled(true);
            return;
        }
    }

    @EventHandler
    private void equip(PlayerArmorChangeEvent event) {
        Player player = event.getPlayer();
        if (!event.getNewItem().getType().equals(Material.ELYTRA)) return;
        if (!this.plugin.get(AdvancementPermissionsManager.class).playerCompletedCondition(player)) {
            Set<Advancement> completedAdvancements = this.plugin
                    .get(AdvancementPermissionsManager.class)
                    .getCompletedAdvancements(player);

            this.sendTimerMessage(player, Component
                    .text("Лети выполняй ачивки, у тебя ").color(Survival.WARN_COLOR)
                    .append(Component.text(completedAdvancements.size() + " из " + this.COUNT_ADVANCEMENT_FOR_COMPLETE)
                            .color(Survival.OFF_COLOR)));
            ItemStack elytra = player.getEquipment().getChestplate();
            player.getEquipment().setChestplate(null);
            player.getWorld().dropItem(player.getLocation(), elytra);
            return;
        }
    }

    private void sendTimerMessage(Player player, Component component) {
        if (Duration.between(
                this.sendMessageTimer.getOrDefault(player, LocalDateTime.now().minusDays(1)),
                LocalDateTime.now()).getSeconds() < this.SECOND_INTERVAL) return;
        player.sendMessage(component);
        this.sendMessageTimer.put(player, LocalDateTime.now());
    }

    public boolean playerCompletedCondition(@NotNull Player player) {

        AtomicInteger competeCount = new AtomicInteger();
        Bukkit.advancementIterator().forEachRemaining(advancement -> {
            if (advancement.getDisplay() == null || advancement.getDisplay().isHidden()) return;
            if (!player.getAdvancementProgress(advancement).isDone()) return;
            competeCount.getAndIncrement();
        });

        return competeCount.get() >= this.COUNT_ADVANCEMENT_FOR_COMPLETE;
    }

    public Set<Advancement> getCompletedAdvancements(@NotNull Player player) {
        Set<Advancement> completedAdvancements = new HashSet<>();

        Bukkit.advancementIterator().forEachRemaining(advancement -> {
            if (advancement.getDisplay() == null || advancement.getDisplay().isHidden()) return;
            if (!player.getAdvancementProgress(advancement).isDone()) return;
            completedAdvancements.add(advancement);
        });

        return completedAdvancements;
    }
}
