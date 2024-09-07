package castroproject.survival.commands;

import castroproject.common.Manager;
import castroproject.survival.Survival;
import castroproject.survival.worldincidents.TeleportEvent;
import io.papermc.paper.chat.ChatRenderer;
import io.papermc.paper.event.player.AsyncChatEvent;
import net.kyori.adventure.audience.Audience;
import net.kyori.adventure.chat.SignedMessage;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.ComponentLike;
import net.kyori.adventure.text.event.ClickCallback;
import net.kyori.adventure.text.event.ClickEvent;
import net.kyori.adventure.text.event.HoverEvent;
import net.kyori.adventure.text.format.TextDecoration;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;

import javax.annotation.Nonnull;
import java.time.Duration;
import java.time.temporal.TemporalAmount;
import java.time.temporal.TemporalUnit;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;

public class CommandTprManager implements Manager {
    private final Survival plugin;

    public CommandTprManager(@Nonnull Survival plugin) {
        this.plugin = plugin;
    }

    public void command(@Nonnull Player playerFrom, @Nonnull String[] args) {
        if (args.length == 0) {
            playerFrom.sendMessage("Напиши нормально /tpr ник игрока");
            return;
        }
        if (args.length == 1) {
            for (Player playerTo : Bukkit.getOnlinePlayers()) {
                if (playerTo.getName().equalsIgnoreCase(args[0])) {
                    playerFrom.sendMessage(Component
                            .text("Подожди пока ").color(Survival.INFO_COLOR)
                            .append(Component.text(playerTo.getName()).color(Survival.WARN_COLOR))
                            .append(Component.text(" телепортирует тебя к себе").color(Survival.INFO_COLOR))
                    );
                    playerTo.sendMessage(Component
                            .text("Игрок ").color(Survival.INFO_COLOR)
                            .append(Component.text(playerFrom.getName()).color(Survival.WARN_COLOR))
                            .append(Component.text("""
                                     хочет телепортироваться к тебе
                                    Позволим?
                                    """).color(Survival.INFO_COLOR))
                            .append(Component.text("-=-=-=-=-=Да=-=-=-=-=-")
                                    .color(Survival.ON_COLOR)
                                    .decorate(TextDecoration.BOLD)
                                    .hoverEvent(HoverEvent.showText(Component
                                            .text("Нажми для телепортации").color(Survival.WARN_COLOR)))
                                    .clickEvent(ClickEvent.callback(audience -> {
                                if (!playerFrom.isOnline()) {
                                    playerTo.sendMessage(Component.text("Он уже вышел с сервера").color(Survival.WARN_COLOR));
                                    return;
                                }
                                this.plugin.get(TeleportEvent.class).teleport(playerFrom, playerTo.getLocation());
                            }, ClickCallback.Options.builder().uses(1).lifetime(Duration.ofMinutes(1)).build())))
                    );
                    return;
                }
            }
            playerFrom.sendMessage(Component.text("Такого игрока нет, или он вышел с сервера").color(Survival.WARN_COLOR));
        }
    }
}
