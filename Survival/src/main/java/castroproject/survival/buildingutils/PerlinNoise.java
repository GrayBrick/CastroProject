package castroproject.survival.buildingutils;

import java.awt.*;
import java.util.Random;

public class PerlinNoise {

    private static final int PERSISTENCE = 5;
    private static final int OCTAVES = 4;

    public static double noise(double x, double y, int octaves, int PERSISTENCE) {
        double total = 0;
        for (int i = 0; i < octaves - 1; i++) {
            double frequency = Math.pow(2, i);
            double amplitude = Math.pow(PERSISTENCE, -i);
            total = total + smoothNoise(x * frequency, y * frequency) * amplitude;
        }
        return total;
    }

    private static double smoothNoise(double x, double y) {
        double corners = (noiseInt(x - 1, y - 1) + noiseInt(x + 1, y - 1) + noiseInt(x - 1, y + 1) + noiseInt(x + 1, y + 1)) / 16;
        double sides = (noiseInt(x - 1, y) + noiseInt(x + 1, y) + noiseInt(x, y - 1) + noiseInt(x, y + 1)) / 8;
        double center = noiseInt(x, y) / 4;
        return corners + sides + center;
    }

    private static double noiseInt(double x, double y) {
        int n = (int) x + (int) y * 57;
        n = (n << 13) ^ n;
        return (1.0 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0);
    }

    public static double[][] toFloats(int x, int z, int octaves, int PERSISTENCE) {
        //random();
        double[][] ret = new double[x][z];
        for (int i = 0; i < x; i++) {
            for (int j = 0; j < z; j++) {
                ret[i][j] = noise(i * 1.0, j * 1.0, octaves, PERSISTENCE);
            }
        }
        return ret;
    }

//    /**
//     * Source of entropy
//     */
//    private Random rand_;
//
//    /**
//     * Amount of roughness
//     */
//    float roughness_;
//
//    /**
//     * Plasma fractal grid
//     */
//    private float[][] grid_;
//
//
//    /**
//     * Generate a noise source based upon the midpoint displacement fractal.
//     *
//     * @param rand      The random number generator
//     * @param roughness a roughness parameter
//     * @param width     the width of the grid
//     * @param height    the height of the grid
//     */
//    public PerlinNoise(Random rand, float roughness, int width, int height) {
//        roughness_ = roughness / width;
//        grid_ = new float[width][height];
//        rand_ = (rand == null) ? new Random() : rand;
//    }
//
//
//    public void initialise() {
//        int xh = grid_.length - 1;
//        int yh = grid_[0].length - 1;
//
//        // set the corner points
//        grid_[0][0] = rand_.nextFloat() - 0.5f;
//        grid_[0][yh] = rand_.nextFloat() - 0.5f;
//        grid_[xh][0] = rand_.nextFloat() - 0.5f;
//        grid_[xh][yh] = rand_.nextFloat() - 0.5f;
//
//        // generate the fractal
//        generate(0, 0, xh, yh);
//    }
//
//
//    // Add a suitable amount of random displacement to a point
//    private float roughen(float v, int l, int h) {
//        return v + roughness_ * (float) (rand_.nextGaussian() * (h - l));
//    }
//
//
//    // generate the fractal
//    private void generate(int xl, int yl, int xh, int yh) {
//        int xm = (xl + xh) / 2;
//        int ym = (yl + yh) / 2;
//        if ((xl == xm) && (yl == ym)) return;
//
//        grid_[xm][yl] = 0.5f * (grid_[xl][yl] + grid_[xh][yl]);
//        grid_[xm][yh] = 0.5f * (grid_[xl][yh] + grid_[xh][yh]);
//        grid_[xl][ym] = 0.5f * (grid_[xl][yl] + grid_[xl][yh]);
//        grid_[xh][ym] = 0.5f * (grid_[xh][yl] + grid_[xh][yh]);
//
//        float v = roughen(0.5f * (grid_[xm][yl] + grid_[xm][yh]), xl + yl, yh
//                + xh);
//        grid_[xm][ym] = v;
//        grid_[xm][yl] = roughen(grid_[xm][yl], xl, xh);
//        grid_[xm][yh] = roughen(grid_[xm][yh], xl, xh);
//        grid_[xl][ym] = roughen(grid_[xl][ym], yl, yh);
//        grid_[xh][ym] = roughen(grid_[xh][ym], yl, yh);
//
//        generate(xl, yl, xm, ym);
//        generate(xm, yl, xh, ym);
//        generate(xl, ym, xm, yh);
//        generate(xm, ym, xh, yh);
//    }
//
//
//    /**
//     * Dump out as a CSV
//     */
//    public void printAsCSV() {
//        for (int i = 0; i < grid_.length; i++) {
//            for (int j = 0; j < grid_[0].length; j++) {
//                System.out.print(grid_[i][j]);
//                System.out.print(",");
//            }
//            System.out.println();
//        }
//    }
//
//
//    /**
//     * Convert to a Boolean array
//     *
//     * @return the boolean array
//     */
//    public float[][] toFloats() {
//        return this.grid_;
//    }
}
