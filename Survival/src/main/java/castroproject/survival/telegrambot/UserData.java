package castroproject.survival.telegrambot;

import castroproject.common.utils.YamlConfig;
import com.pengrad.telegrambot.model.Chat;
import com.pengrad.telegrambot.model.request.InlineKeyboardMarkup;
import com.pengrad.telegrambot.model.request.ReplyKeyboardMarkup;
import org.bukkit.configuration.ConfigurationSection;

import javax.annotation.Nullable;
import java.util.HashMap;
import java.util.Map;

import static castroproject.survival.telegrambot.TelegramBotManager.CONFIG_KEY_USERS;

public class UserData {
    private final TelegramBotManager managerBot;
    final private Map<String, ChangeHabit> habits = new HashMap<>();
    final private Chat chat;
    final private long chatId;
    final private String firstName;
    private boolean wantNewHabit = false;
    private String nowChanged;

    public UserData(TelegramBotManager managerBot, Chat chat) {
        this.managerBot = managerBot;
        this.chat = chat;
        this.chatId = chat.id();
        this.firstName = chat.firstName();
    }

    public void loadHabits() {
        YamlConfig config = this.managerBot.getConfig();
        final String key = CONFIG_KEY_USERS + chatId + ".";

        ConfigurationSection habitsConfig = config.config.getConfigurationSection(key + "habits");
        if (habitsConfig == null) return;

        habitsConfig.getKeys(false).forEach(name -> {
            ConfigurationSection habitConfig = habitsConfig.getConfigurationSection(name);
            if (habitConfig == null) return;
            this.habits.put(name, new ChangeHabit().load(habitConfig));
        });

        this.nowChanged = config.config.getString(key + "now_changed");
    }

    public void saveHabits() {
        YamlConfig config = this.managerBot.getConfig();
        final String key = CONFIG_KEY_USERS + chatId + ".";

        ConfigurationSection habitsConfig = config.config.createSection(key + "habits");

        this.habits.forEach((name, habit) -> {
            ConfigurationSection habitConfig = habitsConfig.createSection(name);
            habit.save(habitConfig);
        });
        config.config.set(key + "now_changed", this.nowChanged);
    }

    public Chat getChat() {
        return this.chat;
    }

    public Map<String, ChangeHabit> getHabits() {
        return this.habits;
    }

    public String getFirstName() {
        return this.firstName;
    }

    public long getChatId() {
        return this.chatId;
    }

    public void setWantNewHabit(boolean want) {
        this.wantNewHabit = want;
    }

    public boolean getWantNewHabit() {
        return this.wantNewHabit;
    }

    public void setNowChanged(@Nullable String habitData) {
        this.nowChanged = habitData;
    }

    @Nullable
    public ChangeHabit getNowChanged() {
        return this.habits.get(this.nowChanged);
    }

    public void sendMessage(String text) {
        this.managerBot.sendMessage(this.getChatId(), text);
    }

    public void sendMessage(String text, InlineKeyboardMarkup inlineKeyboardMarkup) {
        this.managerBot.sendMessage(this.getChatId(), text, inlineKeyboardMarkup);
    }

    public void sendMessage(String text, ReplyKeyboardMarkup replyKeyboardMarkup) {
        this.managerBot.sendMessage(this.chatId, text, replyKeyboardMarkup);
    }

    public void sendMessageNullReplyKeyboard(String text) {
        this.managerBot.sendMessageNullReplyKeyboard(this.chatId, text);
    }
}
