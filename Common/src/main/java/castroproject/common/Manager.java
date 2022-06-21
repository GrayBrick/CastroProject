package castroproject.common;

public interface Manager {
    default void saveManagerData(boolean async) {
    }

    default void unloadManager() {
    }
}
