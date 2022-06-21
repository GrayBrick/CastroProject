package castroproject.common.sqlutils;

import castroproject.common.Manager;
import castroproject.common.utils.YamlConfig;
import net.kyori.adventure.text.format.TextColor;
import org.bukkit.Bukkit;
import org.bukkit.configuration.file.YamlConfiguration;

import java.io.File;
import java.io.IOException;
import java.sql.*;

public class DataBaseManager implements Manager {

	private final String FILE_CONFIGURATION = "dataBaseConfig.yml";
	private final int TIME_OUT = 2000;

	private Connection dbConnection;
	public YamlConfig config;

	public DataBaseManager() {
		dbConnection = null;
		if (!iniConfig()) {
			return ;
		}
		try {
			setConnection();
		} catch (ClassNotFoundException e) {
			e.printStackTrace();
			Bukkit.getServer().getLogger().warning("Ошибка подключения к базе данных");
		} catch (SQLException e) {
			Bukkit.getServer().getLogger().warning("Ошибка подключения к базе данных");
			e.printStackTrace();
		}
	}

	private boolean iniConfig() {
		YamlConfig config = new YamlConfig(FILE_CONFIGURATION);

		if (!config.config.contains("host") || config.config.getString("host").equals("test")) {
			YamlConfiguration configuration = config.config;
			configuration.set("host", "test");
			configuration.set("port", "3306");
			configuration.set("user", "user");
			configuration.set("password", "pass");
			configuration.set("DataBaseName", "dbName");
			config.save();
			Bukkit.getServer().getLogger().warning(FILE_CONFIGURATION + " не содержит данных для подключения");
			return false;
		}
		this.config = config;
		return true;
	}

	private Connection setConnection()
		throws ClassNotFoundException, SQLException
	{
		YamlConfiguration config = this.config.config;
		String connectionString = "jdbc:mysql://"
			+ config.get("host") + ":"
			+ config.getInt("port") + "/"
			+ config.get("DataBaseName");

		Class.forName("com.mysql.jdbc.Driver");

		dbConnection = DriverManager.getConnection(connectionString, config.getString("user"), config.getString("password"));
		return dbConnection;
	}

	public Connection getDbConnection() {
		try {
			if (this.dbConnection != null && this.dbConnection.isValid(TIME_OUT))
				return this.dbConnection;
		} catch (SQLException e) {
			try {
				return setConnection();
			} catch (ClassNotFoundException ex) {
				ex.printStackTrace();
			} catch (SQLException ex) {
				ex.printStackTrace();
			}
		}
		try {
			return setConnection();
		} catch (ClassNotFoundException e) {
			e.printStackTrace();
		} catch (SQLException e) {
			e.printStackTrace();
		}
		return null;
	}

	public void createTableIfNotExists(String tableName, String nameColumn, String papmColumn)
	{
		try (PreparedStatement statement = this.dbConnection.prepareStatement(
			"CREATE TABLE IF NOT EXISTS " + tableName + " ( " +
				nameColumn + " " + papmColumn + ");")) {
			statement.execute();
		} catch (SQLException e) {
			e.printStackTrace();
		}
	}

	public void addColumnInTable(String tableName, String columnName, String dataType)
	{
		if (columnIsCreate(tableName, columnName))
			return ;
		String insert = "ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + dataType;

		try
		{
			PreparedStatement prSt = this.dbConnection.prepareStatement(insert);
			prSt.executeUpdate();
		} catch (Exception ex)
		{
			ex.printStackTrace();
		}
	}

	public boolean columnIsCreate(String tableName, String columnName)
	{
		String insert = "SELECT count(COLUMN_NAME)\n" +
			"            FROM INFORMATION_SCHEMA.COLUMNS\n" +
			"        WHERE TABLE_SCHEMA = '" + config.config.getString("DataBaseName") + "' AND TABLE_NAME = '" + tableName + "' AND COLUMN_NAME = '" + columnName + "';";

		ResultSet resultSet = null;

		try
		{
			PreparedStatement prSt = this.dbConnection.prepareStatement(insert);

			resultSet = prSt.executeQuery();

			if (resultSet.next())
				if (resultSet.getInt(1) == 1)
				{
					resultSet.close();
					return true;
				}
			resultSet.close();
			return false;
		} catch (Exception ex)
		{
			ex.printStackTrace();
		}
		return false;
	}
}
