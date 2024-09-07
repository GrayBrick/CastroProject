package castroproject.survival;

import castroproject.common.BukkitPlugin;
import castroproject.survival.advancementpermissions.AdvancementPermissionsManager;
import castroproject.survival.autosorting.AutoSortingManager;
import castroproject.survival.autosorting.gui.CategoryFilter;
import castroproject.survival.autosorting.gui.MinecraftMaterials;
import castroproject.survival.buildingutils.PerlinNoise;
import castroproject.survival.buildingutils.PerlinNoiseWall;
import castroproject.survival.commands.*;
import castroproject.survival.visualitem.VisualItemManager;
import castroproject.survival.worldincidents.ChatManager;
import castroproject.survival.worldincidents.InfoManager;
import castroproject.survival.worldincidents.TeleportEvent;
import com.destroystokyo.paper.event.player.PlayerAdvancementCriterionGrantEvent;
import com.google.gson.JsonObject;
import com.modulator.manager.Manager;
import com.modulator.manager.ModuleManager;
import com.modulator.manager.telegrambot.TelegramBotManager;
import io.papermc.paper.event.player.PlayerDeepSleepEvent;
import net.kyori.adventure.chat.ChatType;
import net.kyori.adventure.chat.SignedMessage;
import net.kyori.adventure.identity.Identity;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.TextComponent;
import net.kyori.adventure.text.TranslatableComponent;
import net.kyori.adventure.text.event.ClickCallback;
import net.kyori.adventure.text.event.ClickEvent;
import net.kyori.adventure.text.event.HoverEvent;
import net.kyori.adventure.text.format.TextColor;
import org.bukkit.*;
import org.bukkit.advancement.Advancement;
import org.bukkit.attribute.Attribute;
import org.bukkit.block.Block;
import org.bukkit.block.Chest;
import org.bukkit.block.ShulkerBox;
import org.bukkit.block.data.BlockData;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.*;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.*;
import org.bukkit.event.inventory.InventoryType;
import org.bukkit.event.inventory.PrepareAnvilEvent;
import org.bukkit.event.player.*;
import org.bukkit.inventory.*;
import org.bukkit.inventory.meta.ArmorMeta;
import org.bukkit.inventory.meta.BlockStateMeta;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.util.Vector;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;

import java.io.*;
import java.security.SecureRandom;
import java.text.DecimalFormat;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.temporal.TemporalUnit;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

public final class Survival extends BukkitPlugin implements Listener {

    public final static TextColor INFO_COLOR = TextColor.fromHexString("#00ff8c");
    public final static TextColor INFO_COLOR_BOLT = TextColor.fromHexString("#5effb1");
    public final static TextColor ERROR_COLOR = TextColor.fromHexString("#ff0000");
    public final static TextColor WARN_COLOR = TextColor.fromHexString("#ff8c00");
    public final static TextColor ON_COLOR = TextColor.fromHexString("#0cc415");
    public final static TextColor OFF_COLOR = TextColor.fromHexString("#c40c0c");

    public final HashMap<String, String> localisationMap = new HashMap<>();

    @Override
    public void onPluginEnable() {
        this.loadLocalisation();
        //this.registerManager(new TelegramBotManager("telegramBot.yml"));
        this.registerManager(new CommandSpawnManager(this, "spawn.yml"));
        this.registerManager(new CommandHomeManager(this, "playersHome.yml"));
        this.registerManager(new CommandTprManager(this));
        this.registerManager(new CommandFindAllBiomes(this));
        //this.registerManager(new BlockExplodeEventManager(this));
        //this.registerManager(new SkyBlockManager(this));
        this.registerManager(new InfoManager(this));

        this.registerManager(new TeleportEvent(this));
        this.registerManager(new VisualItemManager(this));
        //this.registerManager(new AutoSortingManager(this, "chest_system.yml"));
        this.registerManager(new AdvancementPermissionsManager(this));
        this.registerManager(new ChatManager(this));

        this.getServer().getPluginManager().registerEvents(this, this);
        ModuleManager.startModule(new String[0]);
    }

    public static void main(String[] args) {
        ModuleManager.startModule(args);
    }

    @Override
    public void onPluginDisable() {
        System.out.println("Unload managers");
        ModuleManager.moduleManager.managers.values().forEach(Manager::unloadManager);
        ModuleManager.moduleManager.get(TelegramBotManager.class).bot.onClosing();
    }

    private void loadLocalisation() {
        String fileName = "ru_RU.yml";
        JSONObject jsonObject = null;
        try {
            InputStream in = this.getClass().getClassLoader().getResourceAsStream(fileName);
            BufferedReader reader = new BufferedReader(new InputStreamReader(in));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            jsonObject = (JSONObject) new JSONParser().parse(sb.toString());
        } catch (Exception exception) {
            exception.printStackTrace();
        }

        jsonObject.forEach((a, b) -> this.localisationMap.put(a.toString(), b.toString()));
    }

    @Override
    public boolean onCommand(CommandSender sender, Command c, String s, String[] args) {
        if (sender instanceof Player player) {
            if (c.getName().equalsIgnoreCase("spawn")) {
                this.get(CommandSpawnManager.class).command(player, args);
                return true;
            }
            if (c.getName().equalsIgnoreCase("home")) {
                this.get(CommandHomeManager.class).command(player, args);
                return true;
            }
            if (c.getName().equalsIgnoreCase("tpr")) {
                this.get(CommandTprManager.class).command(player, args);
                return true;
            }
            if (c.getName().equalsIgnoreCase("findBiomes")) {
                this.get(CommandFindAllBiomes.class).command(player, args);
                return true;
            }
            if (c.getName().equalsIgnoreCase("test")) {
                if (!player.isOp()) {
                    player.sendMessage(Component.text("Гуляй лесом, смертный").color(Survival.ERROR_COLOR));
                    return true;
                }
                test(player, args);
            }
        }
        return true;
    }

    @EventHandler
    public static void sleep(PlayerDeepSleepEvent event) {
        Player player = event.getPlayer();
        int needForSleep = player.getWorld().getPlayers().size() / 2;
        int nowDeepSleep = 0;
        for (Player worldPlayer : player.getWorld().getPlayers()) {
            if (!worldPlayer.isDeeplySleeping()) continue;
            nowDeepSleep++;
        }
        if (nowDeepSleep >= needForSleep) {
            event.getPlayer().getWorld().setTime(0);
            event.getPlayer().getWorld().setStorm(false);
            return;
        }
        for (Player worldPlayer : player.getWorld().getPlayers()) {
            if (!worldPlayer.isDeeplySleeping()) continue;
            player.sendActionBar(Component.text("Спят " + nowDeepSleep + " из " + needForSleep));
        }
    }

//    long d0 = new Date().getTime();

    //    @EventHandler
//    private void spawn(EntitySpawnEvent event) {
//        this.runSync().later(() -> {
//            if (!(event.getEntity() instanceof Horse horse) || (new Date().getTime() - d0) < 250) return;
//            d0 = new Date().getTime();
//            for (Entity entity : event.getEntity().getNearbyEntities(10, 10, 10)) {
//                if (entity instanceof Player player) {
//                    System.out.println("find Player");
//                    Horse deadHorse = null;
//                    int countHorses = 0;
//                    for (Entity entity1 : player.getNearbyEntities(10, 10, 10)) {
//                        if (!(entity1 instanceof Horse horse1)) continue;
//                        countHorses++;
//                        if (deadHorse == null || deadHorse.getAttribute(Attribute.GENERIC_MOVEMENT_SPEED).getValue() > horse1.getAttribute(Attribute.GENERIC_MOVEMENT_SPEED).getValue())
//                            deadHorse = horse1;
//                    }
//                    if (deadHorse != null && countHorses >= 5) deadHorse.remove();
//                    for (Entity entity1 : player.getNearbyEntities(10, 10, 10)) {
//                        if (!(entity1 instanceof Horse horse1)) continue;
//                        double speed = horse1.getAttribute(Attribute.GENERIC_MOVEMENT_SPEED).getValue();
//                        Location location = horse1.getLocation();
//                        horse1.remove();
//                        Horse horseNew = (Horse) player.getWorld().spawnEntity(location, EntityType.HORSE);
//                        horseNew.getAttribute(Attribute.GENERIC_MOVEMENT_SPEED).setBaseValue(speed);
//                        horseNew.setOwner(player);
//                        horseNew.setBreed(true);
//                        horseNew.setBreedCause(player.getUniqueId());
//                        horseNew.setLoveModeTicks(80);
//                    }
//                    return;
//                }
//            }
//        }, 5);
//    }

    @EventHandler
    private void projectileHitZombieNoAi(ProjectileHitEvent event) {
//        if (!(event.getEntity() instanceof Zombie zombie)) return;
//        if (zombie.hasAI()) return;
//        if (new Date().getTime() - flagDamage < 50) return;
//        flagDamage = new Date().getTime();
//        zombie.setHealth(zombie.getAttribute(Attribute.GENERIC_MAX_HEALTH).getValue());
//
//        if (!(event.getEntity().getShooter() instanceof Player player)) return;
//
//        Component damage = Component.text(format.format(event.get)).color(Survival.WARN_COLOR);
//        double randomD = 0.5;
//
//        ArmorStand armorStand = (ArmorStand) zombie.getWorld().spawnEntity(zombie.getLocation(), EntityType.ARMOR_STAND);
//        armorStand.setVisible(false);
//        armorStand.setBasePlate(false);
//        armorStand.customName(damage);
//        armorStand.setCustomNameVisible(true);
//        armorStand.setVelocity(new Vector(
//                Math.random() * randomD - randomD / 2.0,
//                Math.random() * randomD,
//                Math.random() * randomD - randomD / 2.0
//        ));
//
//        this.runSync().later(() -> {
//            armorStand.remove();
//        }, 10);


//        if (!player.getInventory().getItem(EquipmentSlot.OFF_HAND).getType().equals(Material.COMPASS)) return;
//        Component isCritical = event.isCritical() ? Component.text("крит ").color(Survival.INFO_COLOR) : Component.text("");
//        player.sendMessage(isCritical.append(damage).append(Component.text(" урона").color(Survival.INFO_COLOR)));
    }

    private long flagDamageEntity = new Date().getTime();

    @EventHandler
    private void ex(EntityDamageEvent event) {
        if (!(event.getEntity() instanceof Zombie zombie)) return;
        if (zombie.hasAI()) return;
        if (new Date().getTime() - flagDamageEntity < 5) return;
        flagDamageEntity = new Date().getTime();
        zombie.setHealth(zombie.getAttribute(Attribute.GENERIC_MAX_HEALTH).getValue());

        Player player = null;

        if (event instanceof EntityDamageByEntityEvent entityDamageByEntityEvent) {
            if (entityDamageByEntityEvent.getDamager() instanceof Player) {
                player = (Player) entityDamageByEntityEvent.getDamager();
            }
            if (entityDamageByEntityEvent.getDamager() instanceof Projectile projectile && projectile.getShooter() instanceof Player) {
                player = (Player) projectile.getShooter();
            }
            if (entityDamageByEntityEvent.getDamager() instanceof TNTPrimed tntPrimed && tntPrimed.getSource() instanceof Player) {
                player = (Player) tntPrimed.getSource();
            }
            if (entityDamageByEntityEvent.getDamager() instanceof Creeper) {
                for (Entity entity : zombie.getNearbyEntities(10, 10, 10)) {
                    if (!(entity instanceof Player)) continue;
                    player = (Player) entity;
                    break;
                }
            }
            this.showInfoDamage(player, event.getFinalDamage(), event.getCause(), entityDamageByEntityEvent.isCritical(), zombie, event.getDamage());
            return;
        }

        for (Entity entity : zombie.getNearbyEntities(10, 10, 10)) {
            if (!(entity instanceof Player)) continue;
            player = (Player) entity;
            break;
        }
        if (event.getCause().equals(EntityDamageEvent.DamageCause.BLOCK_EXPLOSION)
                || event.getCause().equals(EntityDamageEvent.DamageCause.FIRE_TICK)
                || event.getCause().equals(EntityDamageEvent.DamageCause.FIRE)
                || event.getCause().equals(EntityDamageEvent.DamageCause.POISON)
                || event.getCause().equals(EntityDamageEvent.DamageCause.LAVA)
                || event.getCause().equals(EntityDamageEvent.DamageCause.ENTITY_ATTACK)
                || event.getCause().equals(EntityDamageEvent.DamageCause.ENTITY_EXPLOSION)
                || event.getCause().equals(EntityDamageEvent.DamageCause.BLOCK_EXPLOSION)) {
            this.showInfoDamage(player, event.getFinalDamage(), event.getCause(), true, zombie, event.getDamage());
        }
    }

    private final DecimalFormat format = new DecimalFormat("0.00");

    private final HashMap<Player, HashSet<DamageObject>> damageStat = new HashMap<>();

    record DamageObject(long time, EntityDamageEvent.DamageCause damageCause, double damage, boolean isCritical) {
    }

    private void showInfoDamage(
            Player player,
            double finalDamage,
            EntityDamageEvent.DamageCause damageCause,
            boolean isCritical,
            Zombie zombie,
            double damage) {
        if (player == null) return;
        HashSet<DamageObject> damageObjects = this.damageStat.getOrDefault(player, new HashSet<>());

        long endTime = new Date().getTime() - 8000;
        for (DamageObject damageObject : damageObjects) {
            if (damageObject.time() > endTime) endTime = damageObject.time();
        }
        if (new Date().getTime() - endTime > 5000) damageObjects.clear();

        damageObjects.add(new DamageObject(
                new Date().getTime(),
                damageCause,
                finalDamage,
                isCritical));
        this.damageStat.put(player, damageObjects);

        Component damageComp = Component.text(format.format(finalDamage)).color(Survival.ERROR_COLOR);
        double randomD = 0.5;

        ArmorStand armorStand = (ArmorStand) zombie.getWorld().spawnEntity(zombie.getLocation(), EntityType.ARMOR_STAND);
        armorStand.setVisible(false);
        armorStand.setBasePlate(false);
        armorStand.customName(damageComp);
        armorStand.setCustomNameVisible(true);
        armorStand.setVelocity(new Vector(
                Math.random() * randomD - randomD / 2.0,
                Math.random() * randomD,
                Math.random() * randomD - randomD / 2.0
        ));

        this.runSync().later(armorStand::remove, 10);

        if (damageObjects.size() >= 2) {
            int countDamage = 0;
            int countCritical = 0;
            double allDamage = 0;
            long firstTime = new Date().getTime();
            for (DamageObject damageObject : damageObjects) {
                if (damageObject.isCritical()) countCritical++;
                countDamage++;
                allDamage += damageObject.damage();
                if (damageObject.time() < firstTime) firstTime = damageObject.time();
                if (damageObject.time() > endTime) endTime = damageObject.time();
            }
            Component dpm = Component.text(format.format((allDamage - finalDamage) / ((endTime - firstTime) / 60000.0))).color(Survival.WARN_COLOR)
                    .append(Component.text(" DPM ").color(Survival.INFO_COLOR));
            Component medianDamage = Component.text(format.format(allDamage / countDamage)).color(Survival.WARN_COLOR)
                    .append(Component.text(" MD ").color(Survival.INFO_COLOR));
            Component percentCritical = Component.text(format.format(((countCritical * 1.0) / countDamage) * 100)).color(Survival.WARN_COLOR)
                    .append(Component.text(" % критов").color(Survival.INFO_COLOR));
            player.sendActionBar(dpm.append(medianDamage).append(percentCritical));
            if (player.isSneaking()) {
                this.damageStat.put(player, new HashSet<>());
                for (ItemStack armor : zombie.getEquipment().getArmorContents()) {
                    if (armor.getType().equals(Material.AIR)) continue;
                    zombie.getWorld().dropItem(zombie.getLocation(), armor);
                }
                zombie.remove();
            }
        }

        if (!player.getInventory().getItem(EquipmentSlot.OFF_HAND).getType().equals(Material.COMPASS)) return;
        Component isCriticalComp = isCritical ? Component.text("крит\n").color(Survival.INFO_COLOR) : Component.text("");
        Component resistDamage = Component.text(format.format(100 - finalDamage / damage * 100)).color(Survival.WARN_COLOR)
                .append(Component.text(" % отраженного урона броней").color(Survival.INFO_COLOR));

        player.sendMessage(isCriticalComp.append(damageComp)
                .append(Component.text(" урона ").color(Survival.INFO_COLOR).append(Component.text(damageCause.name() + "\n").color(Survival.WARN_COLOR))
                        .append(resistDamage)));
    }

    private long flagInteract = new Date().getTime();

    @EventHandler
    private void interactWithZombieNoAi(PlayerInteractEntityEvent event) {
        if (!(event.getRightClicked() instanceof Zombie zombie)) return;
        if (zombie.hasAI()) return;
        if (new Date().getTime() - flagInteract < 10) return;
        this.flagInteract = new Date().getTime();

        Player player = event.getPlayer();

        ItemStack itemStack = player.getInventory().getItem(EquipmentSlot.HAND);
        if (itemStack.getType().equals(Material.AIR)) {
            for (ItemStack armor : zombie.getEquipment().getArmorContents()) {
                if (armor.getType().equals(Material.AIR)) continue;
                zombie.getWorld().dropItem(zombie.getLocation(), armor);
                if (armor.getType().name().contains("HELMET"))//Material.CHAINMAIL_HELMET
                    zombie.getEquipment().setHelmet(new ItemStack(Material.AIR));
                if (armor.getType().name().contains("CHESTPLATE"))//Material.CHAINMAIL_CHESTPLATE
                    zombie.getEquipment().setChestplate(new ItemStack(Material.AIR));
                if (armor.getType().name().contains("LEGGINGS"))//Material.CHAINMAIL_LEGGINGS
                    zombie.getEquipment().setLeggings(new ItemStack(Material.AIR));
                if (armor.getType().name().contains("BOOTS"))//Material.CHAINMAIL_BOOTS
                    zombie.getEquipment().setBoots(new ItemStack(Material.AIR));
                return;
            }
            return;
        }
        if (!(itemStack.getItemMeta() instanceof ArmorMeta)) return;
        event.setCancelled(true);
        if (itemStack.getType().name().contains("HELMET")
                && zombie.getEquipment().getHelmet().getType().equals(Material.AIR)) { //Material.CHAINMAIL_HELMET
            zombie.getEquipment().setHelmet(itemStack.clone());
            itemStack.setAmount(0);
        }
        if (itemStack.getType().name().contains("CHESTPLATE")
                && zombie.getEquipment().getChestplate().getType().equals(Material.AIR)) { //Material.CHAINMAIL_CHESTPLATE
            zombie.getEquipment().setChestplate(itemStack.clone());
            itemStack.setAmount(0);
        }
        if (itemStack.getType().name().contains("LEGGINGS")
                && zombie.getEquipment().getLeggings().getType().equals(Material.AIR)) { //Material.CHAINMAIL_LEGGINGS
            zombie.getEquipment().setLeggings(itemStack.clone());
            itemStack.setAmount(0);
        }
        if (itemStack.getType().name().contains("BOOTS")
                && zombie.getEquipment().getBoots().getType().equals(Material.AIR)) { //Material.CHAINMAIL_BOOTS
            zombie.getEquipment().setBoots(itemStack.clone());
            itemStack.setAmount(0);
        }
    }

    private void test(@NotNull Player player, String[] args) {

    }
}
