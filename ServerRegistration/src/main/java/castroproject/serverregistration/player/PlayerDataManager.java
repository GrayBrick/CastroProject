package castroproject.serverregistration.player;

import castroproject.common.Manager;
import castroproject.common.sqlutils.DataBaseManager;
import castroproject.serverregistration.ServerRegistration;
import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;
import org.bukkit.entity.Player;
import org.bukkit.entity.Tadpole;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.jetbrains.annotations.NotNull;

import javax.print.attribute.standard.MediaSize;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Date;
import java.util.HashMap;
import java.util.UUID;

public class PlayerDataManager implements Manager {
	private final ServerRegistration plugin;
	public final HashMap<UUID, PlayerData> playerDatas = new HashMap();
	public final String TABLE_NAME = "players";
	public final String COLUMN_PARAM = "TEXT(36) NOT NULL, PRIMARY KEY(uuid(36))";

	private final String UUID_NAME = "uuid";
	private final String PASSWORD_NAME = "password";
	private final String NAME_NAME = "name";
	private final String IP_NAME = "ip";
	private final String FIRST_ENTER_NAME = "first_enter";

	public final String ZERO_PASSWORD = "0";

	public PlayerDataManager(ServerRegistration plugin) {
		this.plugin = plugin;
		ini();
		updateOnlinePlayers();
	}

	@Override
	public void unloadManager() {
		saveAllPLayerDatasSync();
	}

	private void updateOnlinePlayers() {
		for (Player player : Bukkit.getOnlinePlayers())
			getPlayerData(player.getUniqueId());
	}

	private void ini() {
		DataBaseManager dataBase = this.plugin.get(DataBaseManager.class);

		dataBase.createTableIfNotExists(TABLE_NAME, UUID_NAME, COLUMN_PARAM);
		dataBase.addColumnInTable(TABLE_NAME, PASSWORD_NAME, "VARCHAR(45) NOT NULL");
		dataBase.addColumnInTable(TABLE_NAME, NAME_NAME, "VARCHAR(45) NOT NULL");
		dataBase.addColumnInTable(TABLE_NAME, IP_NAME, "VARCHAR(45) NOT NULL");
		dataBase.addColumnInTable(TABLE_NAME, FIRST_ENTER_NAME, "VARCHAR(45) NOT NULL");
	}

	public PlayerData getPlayerData(@NotNull Player player)
	{
		return getPlayerData(player.getUniqueId());
	}

	public PlayerData getPlayerData(UUID uuid) {
		if (this.playerDatas.containsKey(uuid)) return this.playerDatas.get(uuid);

		try (PreparedStatement statement = this.plugin.get(DataBaseManager.class).getDbConnection().prepareStatement(
			"SELECT * FROM " + this.TABLE_NAME + " WHERE uuid=?"
		)) {
			statement.setString(1, uuid.toString());

			ResultSet resultSet = statement.executeQuery();
			if (!resultSet.next()) {
				resultSet.close();
				return createNewPlayerData(uuid);
			}
			PlayerData playerData = new PlayerData(
				uuid,
				resultSet.getString(PASSWORD_NAME),
				resultSet.getString(NAME_NAME),
				resultSet.getString(IP_NAME),
				Long.parseLong(resultSet.getString(FIRST_ENTER_NAME))
			);
			this.playerDatas.put(uuid, playerData);
			resultSet.close();
			return playerData;
		} catch (SQLException e) {
			throw new RuntimeException("Не удалось загрузить данные " + uuid, e);
		}
	}

	public void saveAllPLayerDatasAsync() {
		this.plugin.getServer().getScheduler().runTaskAsynchronously(this.plugin,
			() -> saveAllPLayerDatasSync());
	}

	public void saveAllPLayerDatasSync() {
		for (PlayerData playerData : this.playerDatas.values())
			savePlayerDataSync(playerData);
	}

	public void savePlayerDataAsync(PlayerData playerData) {
		this.plugin.getServer().getScheduler().runTaskAsynchronously(this.plugin,
			() -> savePlayerDataSync(playerData));
	}

	public void savePlayerDataSync(PlayerData playerData) {
		String insert = "INSERT INTO " + this.TABLE_NAME +
			" (" + UUID_NAME + ", " + PASSWORD_NAME + ", " + NAME_NAME + ", " + IP_NAME + ", " + FIRST_ENTER_NAME + ") " +
			" VALUES(?, ?, ?, ?, ?)" +
			" ON DUPLICATE KEY UPDATE  " +
			PASSWORD_NAME + " = ?, " +
			NAME_NAME + " = ?, " +
			IP_NAME + " = ?, " +
			FIRST_ENTER_NAME + " = ?";

		try {
			PreparedStatement prSt = plugin.get(DataBaseManager.class).getDbConnection().prepareStatement(insert);

			int counter = 0;

			prSt.setString(++counter, playerData.uuid.toString());
			prSt.setString(++counter, playerData.password);
			prSt.setString(++counter, playerData.name);
			prSt.setString(++counter, playerData.ip);
			prSt.setString(++counter, String.valueOf(playerData.first_enter));

			prSt.setString(++counter, playerData.password);
			prSt.setString(++counter, playerData.name);
			prSt.setString(++counter, playerData.ip);
			prSt.setString(++counter, String.valueOf(playerData.first_enter));

			prSt.executeUpdate();
		} catch (Exception ex) {
			ex.printStackTrace();
		}
	}

	private PlayerData createNewPlayerData(UUID uuid) {
		OfflinePlayer offlinePlayer = Bukkit.getOfflinePlayer(uuid);
		PlayerData playerData = new PlayerData(
			uuid,
			ZERO_PASSWORD,
			offlinePlayer.getName(),
			"0",
			new Date().getTime()
		);
		this.playerDatas.put(uuid, playerData);
		return playerData;
	}
}
