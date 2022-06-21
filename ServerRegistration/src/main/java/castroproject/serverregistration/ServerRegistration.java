package castroproject.serverregistration;

import castroproject.common.Manager;
import castroproject.common.sqlutils.DataBaseManager;
import castroproject.serverregistration.player.PlayerDataManager;
import org.bukkit.plugin.java.JavaPlugin;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.*;

public final class ServerRegistration extends JavaPlugin {

	private final Map<Class<? extends Manager>, Manager> managers = new LinkedHashMap<>();

	@Override
	public void onEnable() {
		this.registerManager(new DataBaseManager());
		this.registerManager(new PlayerDataManager(this));
	}

	@Override
	public void onDisable() {
		List<Manager> managers = new ArrayList<>(this.managers.values());
		Collections.reverse(managers);
		for (Manager manager : managers) {
			manager.saveManagerData(false);
			manager.unloadManager();
		}
		this.managers.clear();
	}

	protected <T extends Manager> void registerManager(@Nonnull T manager) {
		Class<?> managerClass = manager.getClass();
		do {
			this.registerManager(manager, managerClass);
			for (Class<?> anInterface : managerClass.getInterfaces()) {
				this.registerManager(manager, anInterface);
			}
			managerClass = managerClass.getSuperclass();
		} while (managerClass != Object.class);
	}

	private <T extends Manager> void registerManager(@Nonnull T manager, @Nonnull Class<?> managerClass) {
		if (managerClass == Manager.class) return;
		if (!Manager.class.isAssignableFrom(managerClass)) return;
		if (this.managers.containsKey(managerClass)) {
			throw new IllegalStateException("Manager with class " + managerClass.getName() + " already registered");
		}
		//noinspection unchecked
		this.managers.put((Class<? extends Manager>) managerClass, manager);
	}

	@Nonnull
	public <T extends Manager> T get(@Nonnull Class<T> managerClass) {
		T result = this.getIfPresent(managerClass);
		if (result == null)
			throw new IllegalStateException("Manager " + managerClass.getSimpleName() + " not loaded yet");
		return result;
	}

	@Nullable
	public <T extends Manager> T getIfPresent(@Nonnull Class<T> managerClass) {
		return managerClass.cast(this.managers.get(managerClass));
	}
}
