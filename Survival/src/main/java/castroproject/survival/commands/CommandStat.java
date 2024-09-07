package castroproject.survival.commands;

import castroproject.common.Manager;
import castroproject.survival.Survival;
import castroproject.survival.advancementpermissions.AdvancementPermissionsManager;
import castroproject.survival.worldincidents.TeleportEvent;
import net.kyori.adventure.text.Component;
import org.bukkit.advancement.Advancement;
import org.bukkit.entity.Player;

import javax.annotation.Nonnull;
import java.util.Set;

public class CommandStat implements Manager {
    private final Survival plugin;

    public CommandStat(@Nonnull Survival plugin) {
        this.plugin = plugin;
    }

    public void command(@Nonnull Player player) {
//        Set<Advancement> completedAdvancements = this.get(AdvancementPermissionsManager.class).getCompletedAdvancements(testPlayer);
//
//        player.sendMessage(
//                Component.text("Игрок " + args[0] + " выполнил ачивок: ").color(Survival.INFO_COLOR)
//                        .append(Component.text(completedAdvancements.size()).color(Survival.WARN_COLOR))
//        );
    }
}
