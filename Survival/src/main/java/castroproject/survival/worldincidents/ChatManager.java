package castroproject.survival.worldincidents;

import castroproject.common.Manager;
import castroproject.survival.Survival;
import castroproject.survival.advancementpermissions.AdvancementPermissionsManager;
import io.papermc.paper.chat.ChatRenderer;
import io.papermc.paper.event.player.AsyncChatEvent;
import net.kyori.adventure.audience.Audience;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.ComponentApplicable;
import net.kyori.adventure.text.TextComponent;
import net.kyori.adventure.text.event.ClickEvent;
import net.kyori.adventure.text.event.HoverEvent;
import net.kyori.adventure.text.format.TextColor;
import net.kyori.adventure.text.serializer.ComponentSerializer;
import net.kyori.adventure.text.serializer.legacy.LegacyComponentSerializer;
import org.bukkit.Bukkit;
import org.bukkit.GameMode;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.attribute.Attribute;
import org.bukkit.attribute.AttributeInstance;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Monster;
import org.bukkit.entity.Player;
import org.bukkit.entity.SpawnCategory;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntitySpawnEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.potion.PotionEffect;
import org.bukkit.potion.PotionEffectType;
import org.jetbrains.annotations.NotNull;

import javax.management.monitor.MonitorSettingException;
import java.awt.image.ComponentSampleModel;
import java.text.spi.DateFormatProvider;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Iterator;
import java.util.concurrent.atomic.AtomicReference;

public class ChatManager implements Manager, Listener {
    private final Survival plugin;
    private final int RADIUS_LOCAL_CHAT = 150;
    private final char GLOBAL_CHARACTER = '!';

    public ChatManager(@NotNull Survival plugin) {
        this.plugin = plugin;
        this.plugin.getServer().getPluginManager().registerEvents(this, this.plugin);
    }

    class Render implements ChatRenderer {

        private final Survival plugin;
        private final boolean isGlobal;

        public Render(@NotNull Survival plugin, boolean isGlobal) {
            this.plugin = plugin;
            this.isGlobal = isGlobal;
        }

        @Override
        public Component render(
                @NotNull Player source,
                @NotNull Component sourceDisplayName,
                @NotNull Component message,
                @NotNull Audience viewer) {
            AdvancementPermissionsManager advancementPermissionsManager = this.plugin.get(AdvancementPermissionsManager.class);
            World world = source.getWorld();

            return Component.text()
                    .append(source.teamDisplayName()
                            .hoverEvent(
                                    HoverEvent.showText(Component.text("Клик для телепорта\n").color(Survival.WARN_COLOR)
                                            .append(Component.text("Ачивок: ").color(Survival.INFO_COLOR))
                                            .append(Component
                                                    .text(advancementPermissionsManager.getCompletedAdvancements(source.getPlayer()).size())
                                                    .color(advancementPermissionsManager.playerCompletedCondition(source.getPlayer()) ? Survival.ON_COLOR : Survival.OFF_COLOR))))
                            .clickEvent(
                                    ClickEvent.runCommand("/tpr " + source.getName())))
                    .append(Component.text(": ")
                            .color(world.equals(Bukkit.getWorld("world")) ? TextColor.color(23, 175, 0) :
                                    world.equals(Bukkit.getWorld("world_nether")) ? TextColor.color(153, 0, 153) :
                                    TextColor.color(203, 203, 132)))
                    .append(message.color(isGlobal ? Survival.WARN_COLOR : Survival.INFO_COLOR)
                            .hoverEvent(
                                    HoverEvent.showText(Component.text(DateTimeFormatter.ofPattern("HH:mm").format(LocalDateTime.now()))))
                            .clickEvent(
                                    ClickEvent.suggestCommand("/tell " + source.getName() + " ")
                            ))
                    .build();
        }
    }

    @EventHandler
    private void chatTypeMessage(AsyncChatEvent event) {
        Player player = event.getPlayer();

        boolean isGlobal = LegacyComponentSerializer.legacyAmpersand().serialize(event.message()).charAt(0) == this.GLOBAL_CHARACTER;

        if (isGlobal) {
            event.message(Component.text(LegacyComponentSerializer.legacyAmpersand().serialize(event.message()).substring(1)));
        }

        Iterator<Audience> iterator = event.viewers().iterator();
        while (iterator.hasNext()) {
            Audience audience = iterator.next();
            if (!(audience instanceof Player playerViewer)) continue;
            if (!isGlobal && (!player.getWorld().equals(playerViewer.getWorld()) || player.getLocation().distance(playerViewer.getLocation()) > this.RADIUS_LOCAL_CHAT)) {
                iterator.remove();
            }
        }
        if (event.viewers().size() == 2 && !isGlobal) {
            player.sendMessage(Component.text("Тебя никто не услышал, попробуй добавить ").color(Survival.INFO_COLOR)
                    .append(Component.text("\'" + this.GLOBAL_CHARACTER + "\'").color(Survival.WARN_COLOR))
                    .append(Component.text(" в начало сообщения").color(Survival.INFO_COLOR)));
        }
        event.renderer(new Render(this.plugin, isGlobal));
    }

//    @EventHandler
//    private void zombieUp(EntitySpawnEvent event) {
//        Entity entity = event.getEntity();
//
//        if (!entity.getSpawnCategory().equals(SpawnCategory.MONSTER)) return;
//        if (!(entity instanceof Monster monster)) return;
//
//        AtomicReference<Player> nearbyPlayer = new AtomicReference<>();
//        AtomicReference<Double> distance = new AtomicReference<>((double) 0);
//
//        monster.getWorld().getPlayers().forEach(player -> {
//            if (!player.getGameMode().equals(GameMode.SURVIVAL)) return;
//            if (nearbyPlayer.get() == null) {
//                nearbyPlayer.set(player);
//                distance.set(monster.getLocation().distance(nearbyPlayer.get().getLocation()));
//                return;
//            }
//            if (player.getLocation().distance(monster.getLocation()) > distance.get()) return;
//            nearbyPlayer.set(player);
//            distance.set(player.getLocation().distance(monster.getLocation()));
//        });
//
//        if (nearbyPlayer.get() == null) return;
//
//        double upLevel = 1;
//
//        for (ItemStack armor : nearbyPlayer.get().getEquipment().getArmorContents()) {
//            if (armor.getType().equals(Material.NETHERITE_CHESTPLATE)) {
//                upLevel *= 1.2;
//            }
//            if (armor.getType().equals(Material.NETHERITE_BOOTS)) {
//                upLevel *= 1.1;
//            }
//            if (armor.getType().equals(Material.NETHERITE_HELMET)) {
//                upLevel *= 1.1;
//            }
//            if (armor.getType().equals(Material.NETHERITE_LEGGINGS)) {
//                upLevel *= 1.2;
//            }
//        }
//
//        monster.setGlowing(true);
//        monster.setCustomNameVisible(true);
//        monster.customName(Component.text("Апнутый " + Math.round(upLevel)).color(Survival.WARN_COLOR));
//
//        AttributeInstance maxHealth = monster.getAttribute(Attribute.GENERIC_MAX_HEALTH);
//        maxHealth.setBaseValue(maxHealth.getValue() * upLevel);
//
//        AttributeInstance speed = monster.getAttribute(Attribute.GENERIC_MOVEMENT_SPEED);
//        speed.setBaseValue(speed.getValue() * upLevel);
//
//        AttributeInstance damage = monster.getAttribute(Attribute.GENERIC_ATTACK_DAMAGE);
//        damage.setBaseValue(damage.getValue() * upLevel);
//
//        AttributeInstance attackSpeed = monster.getAttribute(Attribute.GENERIC_ATTACK_SPEED);
//        attackSpeed.setBaseValue(attackSpeed.getValue() * upLevel);
//
//        monster.addPotionEffect(new PotionEffect(PotionEffectType.INVISIBILITY, 10000, 1));
//    }
}
