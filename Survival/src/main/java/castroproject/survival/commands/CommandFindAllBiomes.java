package castroproject.survival.commands;

import castroproject.common.Manager;
import castroproject.survival.Survival;
import it.unimi.dsi.fastutil.Pair;
import net.kyori.adventure.text.Component;
import org.bukkit.Location;
import org.bukkit.block.Biome;
import org.bukkit.entity.Player;

import javax.annotation.Nonnull;

public class CommandFindAllBiomes implements Manager {

    private final Survival plugin;

    public CommandFindAllBiomes(@Nonnull Survival plugin) {
        this.plugin = plugin;
    }

    public void command(@Nonnull Player player, @Nonnull String[] args) {
        Location thisLocation = player.getLocation();
        int radius = 100000;
        int step = 500;
        Biome[] finderBiomes = new Biome[]{
                Biome.CHERRY_GROVE,
                Biome.OCEAN,
                Biome.DESERT,
                Biome.JUNGLE,
                Biome.PLAINS,
                Biome.FOREST,
                Biome.TAIGA
        };
        if (args.length == 0) {
            for (int x = -radius; x < radius; x += step) {
                int finalX = x;
                this.plugin.runAsync().task(() -> {
                    for (int z = -radius; z < radius; z += step) {
                        Location newLocation = new Location(thisLocation.getWorld(),
                                thisLocation.x() + finalX,
                                thisLocation.y(),
                                thisLocation.z() + z);
                        //int finalX = x;
                        boolean allow = true;
                        int sum = 0;
                        for (Biome finderBiome : finderBiomes) {
                            int distance;
                            Pair<Integer, Integer> checkPair = Pair.of(0, 0);
                            while (true) {
                                Location checkLocation = new Location(newLocation.getWorld(),
                                        newLocation.x() + checkPair.left() * step,
                                        newLocation.y(),
                                        newLocation.z() + checkPair.right() * step);
                                if (finderBiome.equals(checkLocation.getWorld().getBiome(checkLocation))) {
                                    distance = (int) checkLocation.distance(newLocation);
                                    break;
                                }
                                checkPair = getNext(checkPair);
                            }
                            //System.out.println(finalX + " " + finalZ + " " + finderBiomes[i].name() + " " + distance);
                            if (distance > 1000) allow = false;
                            sum += distance;
                        }
                        //System.out.println("sum = " + sum);
                        if (sum < 1000) System.out.println(sum + " sum<1000 " + finalX + " " + z);
                        else if (sum < 2000) System.out.println(sum + " sum<2000 " + finalX + " " + z);
                        else if (sum < 3000) System.out.println(sum + " sum<3000 " + finalX + " " + z);
                        else if (sum < 4000) System.out.println(sum + " sum<4000 " + finalX + " " + z);
                        else if (sum < 5000) System.out.println(sum + " sum<5000 " + finalX + " " + z);
                        else if (sum < 6000) System.out.println(sum + " sum<6000 " + finalX + " " + z);
                    }
                });
            }
        }
        if (args.length == 1 && args[0].equals("set")) {
            for (int i = 0; i < finderBiomes.length; i++) {
                int distance;
                Pair<Integer, Integer> checkPair = Pair.of(0, 0);
                while (true) {
                    Location checkLocation = new Location(thisLocation.getWorld(),
                            thisLocation.x() + checkPair.left() * step,
                            thisLocation.y(),
                            thisLocation.z() + checkPair.right() * step);
                    if (finderBiomes[i].equals(checkLocation.getWorld().getBiome(checkLocation))) {
                        distance = (int) checkLocation.distance(thisLocation);
                        break;
                    }
                    checkPair = getNext(checkPair);
                }
                System.out.println(finderBiomes[i].name() + " " + distance);
            }
        }
    }

    private Pair<Integer, Integer> getNext(int x, int z) {
        int m_x = Math.abs(x);
        int m_z = Math.abs(z);

        if (m_x > m_z) {
            return Pair.of(x, z + (x < 0 ? 1 : -1));
        } else if (m_x < m_z) {
            return Pair.of(x + (z < 0 ? -1 : 1), z);
        } else {
            if (x > 0 && z < 0) return Pair.of(x - 1, z);
            else if (x < 0 && z < 0) return Pair.of(x, z + 1);
            return Pair.of(x + 1, z);
        }
    }

    private Pair<Integer, Integer> getNext(@Nonnull Pair<Integer, Integer> pair) {
        return this.getNext(pair.left(), pair.right());
    }
}
