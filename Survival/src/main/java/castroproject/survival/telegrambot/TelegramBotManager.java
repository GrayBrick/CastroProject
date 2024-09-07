package castroproject.survival.telegrambot;

import castroproject.common.Manager;
import castroproject.common.utils.YamlConfig;
import com.pengrad.telegrambot.TelegramBot;
import com.pengrad.telegrambot.UpdatesListener;
import com.pengrad.telegrambot.model.*;
import com.pengrad.telegrambot.model.botcommandscope.BotCommandScopeDefault;
import com.pengrad.telegrambot.model.request.*;
import com.pengrad.telegrambot.request.EditMessageText;
import com.pengrad.telegrambot.request.GetChat;
import com.pengrad.telegrambot.request.SendMessage;
import com.pengrad.telegrambot.request.SetMyCommands;
import org.bukkit.configuration.ConfigurationSection;
import org.codehaus.plexus.util.CachedMap;

import javax.annotation.Nullable;
import java.awt.*;
import java.awt.event.InputEvent;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.DecimalFormat;
import java.util.*;
import java.util.List;

public class TelegramBotManager implements Manager {

    public static final String CONFIG_KEY_USERS = "users.";
    private final TelegramBot bot;
    private final Map<Long, UserData> users = new HashMap<>();

    private final YamlConfig config;

//    public static void main(String args[]) {
//        try {
//            System.out.println(getHTML("https://api-testnet.bybit.com/v5/market/recent-trade?category=inverse&symbol=MATICUSDT&limit=1"));
//        } catch (Exception e) {}
//    }

    public static String getHTML(String urlToRead) throws Exception {
        StringBuilder result = new StringBuilder();
        URL url = new URL(urlToRead);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream()))) {
            for (String line; (line = reader.readLine()) != null; ) {
                result.append(line);
            }
        }
        return result.toString();
    }

    public TelegramBotManager(String configName) {
        this.config = new YamlConfig(configName);

        this.bot = new TelegramBot("6302611947:AAHGzcdE9ZnufrAvSJAGGrOa7Fz2W1nQ_08");

        SetMyCommands setMyCommands = new SetMyCommands(
                new BotCommand("/start", "start bot"),
                new BotCommand("/newhabit", "create new habit"),
                new BotCommand("/habitlist", "list of habit"));


        this.bot.execute(setMyCommands);

        this.loadAllUserData();

        this.bot.setUpdatesListener(updates -> {
            updates.forEach(this::processingUpdate);
            return UpdatesListener.CONFIRMED_UPDATES_ALL;
        });
    }

    private void processingUpdate(Update update) {
        if (update.message() != null) processingMessage(update.message());
        if (update.callbackQuery() != null) processingCallbackQuery(update.callbackQuery());
    }

    private void loadAllUserData() {
        ConfigurationSection usersConfig = this.config.config.getConfigurationSection(CONFIG_KEY_USERS);

        if (usersConfig == null) return;
        usersConfig.getKeys(false).forEach(chatId -> {
            this.loadUserData(Long.parseLong(chatId));
        });
    }

    private void saveAllUserData() {
        this.users.values().forEach(this::writeInConfig);
        this.config.save();
    }

    private void writeInConfig(UserData userData) {
        final String key = CONFIG_KEY_USERS + userData.getChatId();

        config.config.set(key, null);
        config.config.createSection(key);
        userData.saveHabits();
    }

    private void loadUserData(long chatId) {
        Chat chat = this.getChat(chatId);

        UserData userData = new UserData(this, chat);
        this.users.put(userData.getChatId(), userData);
        userData.loadHabits();
    }

    public YamlConfig getConfig() {
        return this.config;
    }

    public Chat getChat(long chatId) {
        return this.bot.execute(new GetChat(chatId)).chat();
    }

    final static String YES_DATA = "YES_DATA";
    final static String CERTAINLY_DATA = "CERTAINLY_DATA";
    final static String NO_DATA = "NO_DATA";
    final static String HABIT_KEY = "HABIT";
    final static String YELLOW = "YELLOW";
    final static String GREEN = "GREEN";
    final static String RED = "RED";

    final static String STATUS_ALLOW = "\uD83D\uDFE2";
    final static String STATUS_DISALLOW = "\uD83D\uDD34";
    final static String STATUS_RESERVE = "\uD83D\uDFE1";

    final static String STATISTIC = "STATISTIC";

    final static int MAX_DAY_TO_HABIT = 365 * 10;

    private void nowChanged(UserData userData, String text) {
        ChangeHabit changedHabit = userData.getNowChanged();
        int integerFromText;
        try {
            integerFromText = Integer.parseInt(text);
        } catch (Exception e) {
            userData.sendMessage("Мне нужно целое число");
            return;
        }
        if (changedHabit.getStartWeeklyProbability() == -1) {
            if (!changedHabit.setStartWeeklyUses(integerFromText)) {
                userData.sendMessage("Выбери от 0 до 7");
                return;
            }
            userData.sendMessage(
                    "Отлично! теперь укажи сколько раз в неделю ты хочешь выполнять данную привычку",
                    this.createReplyKeyboardMarkup(
                            this.createReplyKeyboardMarkup("0", "1", "2", "3"),
                            "4", "5", "6", "7"));
            return;
        }
        if (changedHabit.getFinalWeeklyProbability() == -1) {
            if (!changedHabit.setFinalWeeklyUses(integerFromText)) {
                userData.sendMessage("Выбери от 0 до 7");
                return;
            }
            userData.sendMessageNullReplyKeyboard("Хорошо, теперь напиши за сколько дней ты хочешь прийти к результату");
            return;
        }
        if (changedHabit.getAllDay() == -1) {
            if (!changedHabit.setAllDay(integerFromText)) {
                userData.sendMessage("Выбери от 0 до " + MAX_DAY_TO_HABIT);
                return;
            }
            changedHabit.calculateCoefficient();
            userData.setNowChanged(null);
            userData.sendMessage("Все свои привычки ты можешь смотреть в /habitlist");
            return;
        }
        return;
    }

    private void processingMessage(Message message) {
        long chatId = message.chat().id();
        String text = message.text();

        UserData userData = this.users.get(chatId);

        if (userData != null) {
            if (userData.getWantNewHabit()) {
                this.newHabitCommand(userData, text);
                return;
            }
            if (userData.getNowChanged() != null) {
                this.nowChanged(userData, text);
                return;
            }
        }

        this.textCommand(userData, message);
    }

    private void textCommand(UserData userData, Message message) {
        String text = message.text();

        switch (text) {
            case "/start" -> this.startCommand(message);
            case "/newhabit" -> this.newHabitCommand(userData, null);
            case "/habitlist" -> this.habitList(userData);
            default -> this.defaultCommand(userData);
        }
    }

    private void defaultCommand(UserData userData) {
        if (userData == null) return;
        userData.sendMessage("Извини, это мы не предусмотрели");
    }

    private void habitList(UserData userData) {
        if (userData == null) return;

        InlineKeyboardMarkup inlineKeyboardMarkup = new InlineKeyboardMarkup();
        userData.getHabits().forEach(
                (name, habit) -> {
                    habit.checkThisDay();

                    String statusMessage;
                    switch (habit.getLastDay().statusDay) {
                        case ALLOWED -> statusMessage = STATUS_ALLOW;
                        case DISALLOWED -> statusMessage = STATUS_DISALLOW;
                        case RESERVE_WAS_ALLOWED, RESERVE_WAS_DISALLOWED -> statusMessage = STATUS_RESERVE;
                        default -> statusMessage = "_ошибка_";
                    }

                    inlineKeyboardMarkup.addRow(
                            new InlineKeyboardButton(name + " " +
                                    statusMessage)
                                    .callbackData(HABIT_KEY + "_" + name));
                });
        userData.sendMessage(
                "*Список тових привычек*\n" +
                        STATUS_DISALLOW + " - сегодня делать не нужно\n" +
                        STATUS_ALLOW + " - сегодня это разрешено\n" +
                        STATUS_RESERVE + " - сегодняшнее условие не выполнено",
                inlineKeyboardMarkup);
    }

    private void processingCallbackQuery(CallbackQuery callbackQuery) {
        long chatId = callbackQuery.message().chat().id();
        int messageId = callbackQuery.message().messageId();

        UserData userData = this.users.get(chatId);

        switch (callbackQuery.data()) {
            case CERTAINLY_DATA -> this.newHabitCommand(userData, null);
            case YES_DATA -> {
                userData.sendMessage("Хорошо, придумай название изменяемой привычке, если ты передумал, то просто напиши *отмена*");
                userData.setWantNewHabit(true);
            }
            case NO_DATA -> userData.sendMessage("\uD83E\uDD28");
            case "newAll" -> {
                userData.getHabits().values().forEach(habitData -> {
                    for (int i = 0; i < 150; i++)
                        habitData.calculateNewDay();
                });
            }
        }

        String[] habitsName = callbackQuery.data().split("_");
        if (habitsName[0].equals(HABIT_KEY)) {
            if (habitsName.length == 2) {
                this.showHabit(userData, habitsName);
                return;
            }
            if (habitsName.length == 3) {
                if (!userData.getHabits().containsKey(habitsName[1])) {
                    userData.sendMessage("Такой привычки нет");
                    return;
                }
                ChangeHabit habitData = userData.getHabits().get(habitsName[1]);
                habitData.checkThisDay();

                switch (habitsName[2]) {
                    case YELLOW -> {
                        switch (habitData.getLastDay().statusDay) {
                            case DISALLOWED ->
                                    habitData.getLastDay().statusDay = ChangeHabit.StatusDay.RESERVE_WAS_DISALLOWED;
                            case ALLOWED ->
                                    habitData.getLastDay().statusDay = ChangeHabit.StatusDay.RESERVE_WAS_ALLOWED;
                        }
                        this.showHabit(userData, habitsName);
                    }
                    case STATISTIC -> {
                        this.showStatisticHabit(userData, habitsName);
                    }
                    case STATUS_ALLOW -> {
                        habitData.getLastDay().statusDay = ChangeHabit.StatusDay.ALLOWED;
                        this.showHabit(userData, habitsName);
                    }
                    case STATUS_DISALLOW -> {
                        habitData.getLastDay().statusDay = ChangeHabit.StatusDay.DISALLOWED;
                        this.showHabit(userData, habitsName);
                    }
                }
            }
        }
    }

    private void showStatisticHabit(UserData userData, String[] habitsName) {
        if (!userData.getHabits().containsKey(habitsName[1])) {
            userData.sendMessage("Такой привычки нет");
            return;
        }
        ChangeHabit habitData = userData.getHabits().get(habitsName[1]);
        habitData.checkThisDay();

        String statisticMessage = "Статистика привычки *" + habitsName[1] + "*\n\n";

        int lastWeekReserve = 0;
        int lastMonthReserve = 0;
        int allTimeReserve = 0;

        statisticMessage += "\n\n" + habitData.getStartWeeklyProbability() + " " + habitData.getFinalWeeklyProbability() + " " + habitData.getDayCount() + "\n\n";

        int size = habitData.calendar.size();

        for (int i = 0; i < size; i++) {
            ChangeHabit.StatusDay statusDay = habitData.calendar.get(i).statusDay;
            switch (statusDay) {
                case RESERVE_WAS_ALLOWED, RESERVE_WAS_DISALLOWED -> {
                    allTimeReserve++;
                    if (i > size - 7) lastWeekReserve++;
                    if (i > size - 30) lastMonthReserve++;
                }
            }
        }

        DecimalFormat format = new DecimalFormat("#0");


        if (size >= 7)
            statisticMessage += "\nЗа последние 7 дней выполнено: " + format.format(100 - lastWeekReserve / 0.07) + "%";
        if (size >= 30)
            statisticMessage += "\nЗа последние 30 дней выполнено: " + format.format(100 - lastMonthReserve / 0.3) + "%";
        statisticMessage += "\nЗа все время выполнено: " + format.format(100 - lastWeekReserve / (size / 100.0)) + "%";

        statisticMessage += "\n\n";

        for (int i = 0; i < size; i++) {
            switch (habitData.calendar.get(i).statusDay) {
                case ALLOWED ->
                        statisticMessage += habitData.calendar.get(i).day.get(Calendar.DAY_OF_MONTH) + " ";// STATUS_ALLOW;
                case DISALLOWED ->
                        statisticMessage += habitData.calendar.get(i).day.get(Calendar.DAY_OF_MONTH) + " ";// STATUS_DISALLOW;
                case RESERVE_WAS_DISALLOWED, RESERVE_WAS_ALLOWED -> statisticMessage += STATUS_RESERVE;
            }

            if ((i + 1) % 7 == 0) statisticMessage += "\n";
        }

        userData.sendMessage(statisticMessage);
    }

    private void showHabit(UserData userData, String[] habitsName) {
        if (!userData.getHabits().containsKey(habitsName[1])) {
            userData.sendMessage("Такой привычки нет");
            return;
        }
        ChangeHabit habitData = userData.getHabits().get(habitsName[1]);
        habitData.checkThisDay();
        ChangeHabit.StatusDay statusDay = habitData.getLastDay().statusDay;

        String message;

        switch (statusDay) {
            case ALLOWED ->
                    message = STATUS_ALLOW + "\n*Сегодня тебе разрешено это сделать" + "\nЕсли ты не можешь выполнить сегодняшнее условие, то нажми на желтый кружок";
            case DISALLOWED ->
                    message = STATUS_DISALLOW + "\n*Сегодня этого делать не нужно" + "\nЕсли ты не можешь выполнить сегодняшнее условие, то нажми на желтый кружок";
            case RESERVE_WAS_ALLOWED, RESERVE_WAS_DISALLOWED ->
                    message = STATUS_RESERVE + "\n*Попробуй реже допускать такие моменты";
            default -> message = "\n_ошибка выполнения_";
        }

        InlineKeyboardMarkup inlineKeyboardMarkup =
                this.createInlineKeyboardMarkup("Статистика", HABIT_KEY + "_" + habitsName[1] + "_" + STATISTIC);

        if (statusDay.equals(ChangeHabit.StatusDay.ALLOWED) || statusDay.equals(ChangeHabit.StatusDay.DISALLOWED)) {
            userData.sendMessage(
                    "Привычка *" + habitsName[1] + " " + message,
                    this.createInlineKeyboardMarkup(inlineKeyboardMarkup, STATUS_RESERVE, HABIT_KEY + "_" + habitsName[1] + "_" + YELLOW, "new", "newAll"));
        } else {
            userData.sendMessage("Привычка *" + habitsName[1] + " " + message,
                    this.createInlineKeyboardMarkup(
                            inlineKeyboardMarkup,
                            "Вернуть предыдущий статус " +
                                    (statusDay.equals(ChangeHabit.StatusDay.RESERVE_WAS_ALLOWED) ? STATUS_ALLOW : STATUS_DISALLOW),
                            HABIT_KEY + "_" + habitsName[1] + "_" +
                                    (statusDay.equals(ChangeHabit.StatusDay.RESERVE_WAS_ALLOWED) ? STATUS_ALLOW : STATUS_DISALLOW)));
        }
    }

    private void startCommand(Message message) {
        UserData userData;
        if (this.users.containsKey(message.chat().id())) {
            userData = this.users.get(message.chat().id());
            userData.sendMessage(userData.getFirstName() + ", бот уже запущен, чекай меню");
            return;
        }
        userData = new UserData(this, message.chat());
        this.users.put(userData.getChatId(), userData);
        userData.sendMessage(
                "Привет " + userData.getFirstName() + "!\nЯ тебе помогу приобрести \bпривычку\b или убрать ее вовсе, начнем? ",
                this.createInlineKeyboardMarkup("Конечно, Конечно!", CERTAINLY_DATA));
    }

    private void newHabitCommand(UserData userData, @Nullable String nameHabit) {
        if (userData == null) return;
        if (nameHabit == null) {
            userData.sendMessage(
                    "Ты хочешь изменить какую-то привычку?",
                    this.createInlineKeyboardMarkup("Да", YES_DATA, "Нет", NO_DATA));
            return;
        }
        if (nameHabit.equalsIgnoreCase("отмена")) {
            userData.setWantNewHabit(false);
            userData.sendMessage("Ок, в другой раз");
            return;
        }
        if (userData.getHabits().containsKey(nameHabit)) {
            userData.sendMessage("У тебя уже есть такая привычка");
            return;
        }
        if (nameHabit.contains("_")) {
            userData.sendMessage("Название не может содержать символ \"_\"");
            return;
        }
        ChangeHabit habitData = new ChangeHabit();
        userData.getHabits().put(nameHabit, habitData);
        userData.sendMessage("Отлично, теперь ты можешь настроить привычку \"" + nameHabit + "\"");
        userData.setNowChanged(nameHabit);
        userData.setWantNewHabit(false);

        userData.sendMessage(
                "Сколько раз в неделю ты сейчас выполняешь эту привычку?",
                this.createReplyKeyboardMarkup(
                        this.createReplyKeyboardMarkup("0", "1", "2", "3"),
                        "4", "5", "6", "7"));
    }

    @SafeVarargs
    private InlineKeyboardMarkup createInlineKeyboardMarkup(String... buttons) {
        return this.createInlineKeyboardMarkup(null, buttons);
    }

    @SafeVarargs
    private InlineKeyboardMarkup createInlineKeyboardMarkup(@Nullable InlineKeyboardMarkup inlineKeyboardMarkup, String... buttons) {
        if (inlineKeyboardMarkup == null) inlineKeyboardMarkup = new InlineKeyboardMarkup();

        if (buttons.length % 2 != 0) return inlineKeyboardMarkup;

        List<InlineKeyboardButton> inlineKeyboardButtons = new ArrayList<>();
        for (int i = 0; i < buttons.length; i++) {
            if (i % 2 == 0)
                inlineKeyboardButtons.add(new InlineKeyboardButton(buttons[i]));
            else
                inlineKeyboardButtons.get(inlineKeyboardButtons.size() - 1).callbackData(buttons[i]);
        }
        inlineKeyboardMarkup.addRow(inlineKeyboardButtons.toArray(new InlineKeyboardButton[0]));
        return inlineKeyboardMarkup;
    }

    private ReplyKeyboardMarkup createReplyKeyboardMarkup(String... buttons) {
        return this.createReplyKeyboardMarkup(null, buttons);
    }

    private ReplyKeyboardMarkup createReplyKeyboardMarkup(@Nullable ReplyKeyboardMarkup replyKeyboardMarkup, String... buttons) {
        if (replyKeyboardMarkup == null) {
            replyKeyboardMarkup = new ReplyKeyboardMarkup(buttons);
            replyKeyboardMarkup.resizeKeyboard(true);
            return replyKeyboardMarkup;
        }

        List<KeyboardButton> replyKeyboardButtons = new ArrayList<>();
        for (String button : buttons) {
            replyKeyboardButtons.add(new KeyboardButton(button));
        }
        replyKeyboardMarkup.addRow(replyKeyboardButtons.toArray(new KeyboardButton[0]));
        return replyKeyboardMarkup;
    }

//    public static void main(String[] args) {
//        TelegramBotManager manager = new TelegramBotManager("telegramBot");
//    }

    public void sendMessage(long chatId, String text) {
        SendMessage sendMessage = new SendMessage(chatId, text);
        sendMessage.parseMode(ParseMode.Markdown);
        this.bot.execute(sendMessage);
    }

    public void sendMessage(long chatId, String text, InlineKeyboardMarkup inlineKeyboardMarkup) {
        SendMessage sendMessage = new SendMessage(chatId, text);
        sendMessage.replyMarkup(inlineKeyboardMarkup);
        sendMessage.parseMode(ParseMode.Markdown);
        this.bot.execute(sendMessage);
    }

    public void sendMessage(long chatId, String text, ReplyKeyboardMarkup replyKeyboardMarkup) {
        SendMessage sendMessage = new SendMessage(chatId, text);
        sendMessage.replyMarkup(replyKeyboardMarkup);
        sendMessage.parseMode(ParseMode.Markdown);
        this.bot.execute(sendMessage);
    }

    public void sendMessageNullReplyKeyboard(long chatId, String text) {
        SendMessage sendMessage = new SendMessage(chatId, text);
        sendMessage.replyMarkup(new ReplyKeyboardRemove());
        sendMessage.parseMode(ParseMode.Markdown);
        this.bot.execute(sendMessage);
    }

    @Override
    public void unloadManager() {
        this.saveAllUserData();
    }
}
