package castroproject.serverregistration.player;

import castroproject.common.Manager;
import castroproject.common.utils.TextUtils;
import castroproject.serverregistration.ServerRegistration;
import io.papermc.paper.event.player.AbstractChatEvent;
import io.papermc.paper.event.player.AsyncChatEvent;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.title.Title;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerKickEvent;
import org.bukkit.scheduler.BukkitRunnable;

import java.time.Duration;

public class PlayerListenerManager implements Manager, Listener {
	private final ServerRegistration plugin;

	private final int TIMER_UPDATE_MS = 9000;
	private final int KICK_TIME_MS = 100000;

	public PlayerListenerManager(ServerRegistration plugin) {
		this.plugin = plugin;
		Bukkit.getPluginManager().registerEvents(this, this.plugin);
	}

	@EventHandler
	private boolean join(PlayerJoinEvent event) {
		event.joinMessage(null);
		PlayerDataManager manager = this.plugin.get(PlayerDataManager.class);
		PlayerData playerData = getPlayerData(event.getPlayer());

		plugin.getServer().getScheduler().runTaskLater(plugin, () -> {
			if (playerData.getPlayer().isOnline())
			playerData.getPlayer().kick(
				Component.text("Время вышло, попробуй еще раз").color(plugin.JUST_COLOR_TEXT),
				PlayerKickEvent.Cause.PLUGIN
			);
		}, KICK_TIME_MS / 50);

		if (playerData.password.equals(manager.ZERO_PASSWORD)) return eventRegistrationPlayer(playerData);
		return true;
	}

	@EventHandler
	private void playerMessage(AsyncChatEvent event)
	{
		event.setCancelled(true);
		PlayerData playerData = getPlayerData(event.getPlayer());
		AbstractChatEvent abstractChatEvent = event;
		System.out.println(Component.newline());
		System.out.println(abstractChatEvent.message().compact());
		playerData.getPlayer().sendMessage(TextUtils.getTextFromComponent(abstractChatEvent.message()));
	}

	private boolean eventRegistrationPlayer(PlayerData playerData) {
		Player player = playerData.getPlayer();
		new BukkitRunnable() {
			@Override
			public void run() {
				if (!player.isOnline()) cancel();
				player.showTitle(
					Title.title(
						Component.text("Придумай пароль").color(plugin.HIGHLIGHT_COLOR_TEXT),
						Component.text("Напиши его два раза").color(plugin.JUST_COLOR_TEXT),
						Title.Times.times(Duration.ZERO, Duration.ofMillis(TIMER_UPDATE_MS), Duration.ZERO)
					)
				);
				player.sendMessage(
					Component.text("Открой чат ").color(plugin.JUST_COLOR_TEXT).append(
						Component.text("`T`").color(plugin.HIGHLIGHT_COLOR_TEXT).append(
							Component.text(" и напиши туда два раза свой пароль.\n").color(plugin.JUST_COLOR_TEXT).append(
								Component.text("Например:\n").color(plugin.HIGHLIGHT_COLOR_TEXT).append(
									Component.text("  12345GOSHA 12345GOSHA").color(plugin.HIGHLIGHT_COLOR_TEXT)
								)
							)
						)
					)
				);
			}
		}.runTaskTimerAsynchronously(this.plugin, 0, (long) ((TIMER_UPDATE_MS - 500.0) / 50));
		return true;
	}

	private PlayerData getPlayerData(Player player)
	{
		return this.plugin.get(PlayerDataManager.class).getPlayerData(player);
	}
}
