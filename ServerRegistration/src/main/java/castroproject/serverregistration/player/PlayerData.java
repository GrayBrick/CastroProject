package castroproject.serverregistration.player;

import org.bukkit.Bukkit;
import org.bukkit.entity.Player;

import java.util.UUID;

public class PlayerData
{
	public UUID uuid;
	public String password;
	public String name;
	public String ip;
	public long first_enter;

	public PlayerData(UUID uuid, String password, String name, String ip, long first_enter)
	{
		this.uuid = uuid;
		this.password = password;
		this.name = name;
		this.ip = ip;
		this.first_enter = first_enter;
	}

	public boolean isOnline()
	{
		return Bukkit.getOfflinePlayer(this.uuid).isOnline();
	}

	public Player getPlayer()
	{
		if (!isOnline()) return null;
		return Bukkit.getPlayer(this.uuid);
	}
}
