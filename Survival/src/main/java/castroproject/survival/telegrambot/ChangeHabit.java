package castroproject.survival.telegrambot;

import org.bukkit.configuration.ConfigurationSection;

import java.util.*;

public class ChangeHabit {

    private static final int MS_IN_DAY = 1000 * 60 * 60 * 24;
    final private static float DAY_IN_WEEK = 7.0F;
    private int allDay = -1;
    private float startWeeklyProbability = -1;
    private float finalWeeklyProbability = -1;
    private float coefficient;

    private int dayCount = 0;
    private float addCoefficient = 0;

    public List<Day> calendar = new ArrayList<>();

    public class Day {
        Calendar day;
        StatusDay statusDay;

        public Day(Calendar day, StatusDay statusDay) {
            this.day = day;
            this.statusDay = statusDay;
        }
    }

    enum StatusDay {
        ALLOWED,
        DISALLOWED,
        RESERVE_WAS_ALLOWED,
        RESERVE_WAS_DISALLOWED
    }

    public void save(ConfigurationSection section) {
        section.set("allDay", this.allDay);
        section.set("startWeeklyProbability", this.startWeeklyProbability);
        section.set("finalWeeklyProbability", this.finalWeeklyProbability);
        section.set("dayCount", this.dayCount);
        section.set("addCoefficient", this.addCoefficient);

        ConfigurationSection calendarSection = section.createSection("calendar");

        for (int i = 0; i < calendar.size(); i++) {
            Day day = calendar.get(i);

            calendarSection.set(i + ".year", day.day.get(Calendar.YEAR));
            calendarSection.set(i + ".month", day.day.get(Calendar.MONTH));
            calendarSection.set(i + ".day_of_month", day.day.get(Calendar.DAY_OF_MONTH));
            calendarSection.set(i + ".hour_of_day", day.day.get(Calendar.HOUR_OF_DAY));
            calendarSection.set(i + ".minute", day.day.get(Calendar.MINUTE));
            calendarSection.set(i + ".second", day.day.get(Calendar.SECOND));
            calendarSection.set(i + ".millisecond", day.day.get(Calendar.MILLISECOND));

            calendarSection.set(i + ".statusDay", day.statusDay.name());
        }
    }

    public ChangeHabit load(ConfigurationSection section) {
        this.allDay = section.getInt("allDay");
        this.startWeeklyProbability = (float) section.getDouble("startWeeklyProbability");
        this.finalWeeklyProbability = (float) section.getDouble("finalWeeklyProbability");
        this.dayCount = section.getInt("dayCount");
        this.addCoefficient = (float) section.getDouble("addCoefficient");

        ConfigurationSection calendarSection = section.getConfigurationSection("calendar");
        if (calendarSection == null) return this;

        calendarSection.getKeys(false).forEach(dayKey -> {
            Day day = new Day(
                    new GregorianCalendar(
                            calendarSection.getInt(dayKey + ".year"),
                            calendarSection.getInt(dayKey + ".month"),
                            calendarSection.getInt(dayKey + ".day_of_month"),
                            calendarSection.getInt(dayKey + ".hour_of_day"),
                            calendarSection.getInt(dayKey + ".minute"),
                            calendarSection.getInt(dayKey + ".second")),
                    StatusDay.valueOf(calendarSection.getString(dayKey + ".statusDay"))
            );

            day.day.set(Calendar.MILLISECOND, calendarSection.getInt(day + ".millisecond"));

            this.calendar.add(day);
        });
        return this;
    }
    public void checkThisDay() {
        Day day = this.getLastDay();
        if (Math.abs(day.day.compareTo(new GregorianCalendar())) < MS_IN_DAY) return;
        this.calculateNewDay();
    }

    public Day getLastDay() {
        if (this.calendar.isEmpty()) this.calculateNewDay();
        return this.calendar.get(this.calendar.size() - 1);
    }

    public boolean setStartWeeklyUses(int uses) {
        if (uses < 0 || uses > 7) return false;
        this.startWeeklyProbability = uses / DAY_IN_WEEK;
        return true;
    }

    public float getStartWeeklyProbability() {
        return this.startWeeklyProbability;
    }

    public boolean setFinalWeeklyUses(int uses) {
        if (uses < 0 || uses > 7) return false;
        this.finalWeeklyProbability = uses / DAY_IN_WEEK;
        return true;
    }

    public float getFinalWeeklyProbability() {
        return this.finalWeeklyProbability;
    }

    public boolean setAllDay(int days) {
        if (days < 0 || days > TelegramBotManager.MAX_DAY_TO_HABIT) return false;
        this.allDay = days;
        return true;
    }

    public int getAllDay() {
        return this.allDay;
    }

    public void calculateCoefficient() {
        this.coefficient = (this.finalWeeklyProbability - this.startWeeklyProbability) / this.allDay;
    }

    public int getDayCount() {
        return this.dayCount;
    }

    public float getCoefficient() {
        return this.coefficient;
    }

    public void calculateNewDay() {
        float randomProbability = this.finalWeeklyProbability < this.startWeeklyProbability ?
                Math.max(this.dayCount * this.coefficient + this.startWeeklyProbability, this.finalWeeklyProbability)
                :
                Math.min(this.dayCount * this.coefficient + this.startWeeklyProbability, this.finalWeeklyProbability);

        float probabilityToday = randomProbability + this.addCoefficient;

        boolean thisDay = Math.random() < probabilityToday;
        this.calendar.add(new Day(this.getNextDay(), thisDay ? StatusDay.ALLOWED : StatusDay.DISALLOWED));

        if (thisDay) {
            this.addCoefficient -= (1 - randomProbability);
        } else {
            this.addCoefficient += randomProbability;
        }

        this.dayCount++;
    }

    private Calendar getNextDay() {
        if (this.calendar.isEmpty()) return new GregorianCalendar();
        Calendar newDay = ((Calendar) this.getLastDay().day.clone());
        newDay.add(Calendar.DAY_OF_YEAR, 1);
        return newDay;
    }
}
