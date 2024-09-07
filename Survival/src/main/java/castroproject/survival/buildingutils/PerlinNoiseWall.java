package castroproject.survival.buildingutils;

import castroproject.survival.Survival;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.block.Block;
import org.bukkit.block.BlockState;
import org.bukkit.block.data.BlockData;
import org.jetbrains.annotations.NotNull;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Random;

public class PerlinNoiseWall {

    private final Material[] materials = new Material[]{
//            Material.WHITE_WOOL,
//            Material.LIGHT_GRAY_WOOL,
//            Material.GRAY_WOOL,
//            Material.BLACK_WOOL,
//            Material.BROWN_WOOL,
//            Material.RED_WOOL,
//            Material.ORANGE_WOOL,
//            Material.YELLOW_WOOL,
//            Material.LIME_WOOL,
//            Material.GREEN_WOOL,
//            Material.CYAN_WOOL,
//            Material.LIGHT_BLUE_WOOL,
//            Material.BLUE_WOOL,
//            Material.PURPLE_WOOL,
//            Material.MAGENTA_WOOL,
//            Material.PINK_WOOL
            Material.MOSS_BLOCK,
            Material.LIME_TERRACOTTA,
            Material.OXIDIZED_CUT_COPPER,
            Material.PRISMARINE,
            Material.PRISMARINE_BRICKS,
            Material.LIGHT_BLUE_CONCRETE,
            Material.LAPIS_BLOCK
    };

    private final Location startLocation;
    private int wallHeight;
    private int wallWidth;
    private int wallDepth;
    private final HashMap<Location, BlockData> editedBlocks = new HashMap<>();
    private final Survival plugin;
    double frequency;

    public PerlinNoiseWall(@NotNull Survival plugin, @NotNull Location startLocation, int wallHeight, double frequency) {
        this.startLocation = startLocation;
        this.wallHeight = wallHeight;
        this.wallWidth = wallHeight;
        this.wallDepth = wallHeight;
        this.plugin = plugin;
        this.frequency = frequency;
    }

    public void generateWall(long tickToRevert, int max1, int min1) {
        DiamondSquare diamondSquare = new DiamondSquare(wallHeight, max1, min1);
        this.wallWidth = diamondSquare.getSize();
        this.wallHeight = diamondSquare.getSize();
        this.wallDepth = diamondSquare.getSize();

        double min = 0;
        double max = 0;
        double ampl;

        diamondSquare.altAlgorithm();
        double[][] noise = diamondSquare.getDiamondSquare();

        for (double[] floats : noise) {
            for (int j = 0; j < noise[0].length; j++) {
                min = Math.min(floats[j], min);
                max = Math.max(floats[j], max);
            }
        }

        ampl = max - min;

        Material replaceMaterial = Material.AIR;

        for (int x = 0; x < wallWidth; x++) {
            for (int y = 0; y < wallHeight; y++) {
                for (int z = 0; z < wallDepth; z++) {
                    Location location = this.startLocation.clone().add(x, y, z);
                    if (location.getBlock().getType().equals(replaceMaterial)) continue;
                    if (tickToRevert != -1) this.editedBlocks.put(location, location.getBlock().getBlockData());
                    location.getBlock()
                            .setType(this.getMaterialOfPerlinNoise(this.normalise(noise[x][y] + (z * 1.0 / wallDepth), min, ampl)));
                }
            }
        }
        if (tickToRevert == -1) return;
        this.plugin.runSync().later(() -> {
            this.editedBlocks.forEach((location, blockData) -> {
                location.getBlock().setBlockData(blockData);
            });
        }, tickToRevert);
    }

    private double normalise(double x, double min, double ampl) {
        return (x - min) / ampl;
    }

    private Material getMaterialOfPerlinNoise(double noise) {
        //double normalizedN = (noise + 1) / 2.0;
        int index = (int) (noise * this.materials.length);
        return this.materials[Math.abs(index % this.materials.length)];
    }
}
