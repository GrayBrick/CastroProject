package castroproject.common.utils;

import org.bukkit.Bukkit;
import org.bukkit.configuration.file.YamlConfiguration;

import java.io.File;
import java.io.IOException;

public class YamlConfig {

	public final YamlConfiguration config;
	public final File configFile;

	public YamlConfig(String fileName) {
		File dirFile = new File("plugins/Castro");
		File file = new File(dirFile.getAbsolutePath() + "/" + fileName);
		this.configFile = file;

		if (!dirFile.exists()) {
			if (!dirFile.mkdir()) {
				Bukkit.getServer().getLogger().warning("Не удалось создать папку Castro");
				this.config = null;
				return;
			}
		}
		if (!file.exists()) {
			try {
				file.createNewFile();
			} catch (IOException e) {
				Bukkit.getServer().getLogger().warning("Не удалось создать файл " + fileName);
				this.config = null;
				return;
			}
		}
		this.config = YamlConfiguration.loadConfiguration(file);
	}

	public void save()
	{
		try {
			this.config.save(this.configFile);
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
}
