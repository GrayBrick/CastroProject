package castroproject.survival.buildingutils;

import castroproject.common.utils.Randomizer;
import org.jetbrains.annotations.NotNull;

import java.text.DecimalFormat;
import java.text.Format;
import java.util.Random;
import java.util.TreeMap;
import java.util.HashSet;

public class DiamondSquare {

    private final int size;
    private final double maxAddHeight;
    private final double minAddHeight;

    private final double[][] map;
    private final int[][] editCount;

    public DiamondSquare(int size, int maxAddHeight, int minAddHeight) {
        this.size = (int) (Math.pow(2, size) + 1);
        this.map = new double[this.size][this.size];
        this.editCount = new int[this.size][this.size];
        this.maxAddHeight = maxAddHeight;
        this.minAddHeight = minAddHeight;
    }

    public double[][] getDiamondSquare() {
        return this.map;
    }

    public int getSize() {
        return this.size;
    }

    private void initializingCornerPoints() {
        this.setValue(0, 0, this.getRandomValue());
        this.setValue(0, this.size - 1, this.getRandomValue());
        this.setValue(this.size - 1, 0, this.getRandomValue());
        this.setValue(this.size - 1, this.size - 1, this.getRandomValue());
    }

    record Point(int x, int y) {
    }

    private HashSet<Point> square(@NotNull Point point, int lengthLine) {
        double sum = 0;

        if (lengthLine >= 1) {
            sum += this.getValue(point.x + lengthLine, point.y + lengthLine);// this.map[point.x + lengthLine][point.y + lengthLine];
            sum += this.getValue(point.x + lengthLine, point.y - lengthLine);// this.map[point.x + lengthLine][point.y - lengthLine];
            sum += this.getValue(point.x - lengthLine, point.y - lengthLine);// this.map[point.x - lengthLine][point.y + lengthLine];
            sum += this.getValue(point.x - lengthLine, point.y - lengthLine);// this.map[point.x - lengthLine][point.y - lengthLine];

            this.setValue(point.x, point.y, this.getRandomValue(sum / 4));
        }

        return new HashSet<>() {{
            add(new Point(point.x, point.y + lengthLine));
            add(new Point(point.x, point.y - lengthLine));
            add(new Point(point.x + lengthLine, point.y));
            add(new Point(point.x - lengthLine, point.y));
        }};
    }

    private HashSet<Point> rhomb(@NotNull Point point, int lengthLine) {
        double sum = 0;
        int countAdd = 0;

        if (point.x + lengthLine < this.size) {
            sum += this.getValue(point.x + lengthLine, point.y);// this.map[point.x + lengthLine][point.y];
            countAdd++;
        }
        if (point.x - lengthLine >= 0) {
            sum += this.getValue(point.x - lengthLine, point.y);// this.map[point.x - lengthLine][point.y];
            countAdd++;
        }
        if (point.y + lengthLine < this.size) {
            sum += this.getValue(point.x, point.y + lengthLine);// this.map[point.x][point.y + lengthLine];
            countAdd++;
        }
        if (point.y - lengthLine >= 0) {
            sum += this.getValue(point.x, point.y - lengthLine);// this.map[point.x][point.y - lengthLine];
            countAdd++;
        }

        this.setValue(point.x, point.y, this.getRandomValue(sum / countAdd));

        return new HashSet<>() {{
            add(new Point(point.x + lengthLine / 2, point.y + lengthLine / 2));
            add(new Point(point.x + lengthLine / 2, point.y - lengthLine / 2));
            add(new Point(point.x - lengthLine / 2, point.y + lengthLine / 2));
            add(new Point(point.x - lengthLine / 2, point.y - lengthLine / 2));
        }};
    }

    private boolean setValue(int x, int y, double value) {
        if (x < 0 || x >= this.size || y < 0 || y >= this.size) return false;
        this.editCount[x][y]++;
        if (this.editCount[x][y] <= 1)
            this.map[x][y] = value;
        return true;
    }

    private double getValue(int x, int y) {
        if (x < 0 || x >= this.size || y < 0 || y >= this.size) return 0;
        return this.map[x][y];
    }

    private double getRandomValue(double startPoint) {
        return startPoint + (Math.random() * (this.maxAddHeight - this.minAddHeight) + minAddHeight);
    }

    private double getRandomValue() {
        return this.getRandomValue(0);
    }

    public void altAlgorithm() {
        final int DATA_SIZE = this.size;

        final double SEED = 0;

        this.map[0][0] = this.map[0][DATA_SIZE - 1] = this.map[DATA_SIZE - 1][0] =
                this.map[DATA_SIZE - 1][DATA_SIZE - 1] = SEED;

        double h = this.maxAddHeight;
        Random r = new Random();

        for (int sideLength = DATA_SIZE - 1;
             sideLength >= 2;
             sideLength /= 2, h /= 2.0) {
            int halfSide = sideLength / 2;

            for (int x = 0; x < DATA_SIZE - 1; x += sideLength) {
                for (int y = 0; y < DATA_SIZE - 1; y += sideLength) {
                    double avg = this.map[x][y] +
                            this.map[x + sideLength][y] +
                            this.map[x][y + sideLength] +
                            this.map[x + sideLength][y + sideLength];
                    avg /= 4.0;

                    this.map[x + halfSide][y + halfSide] =
                            avg + (r.nextDouble() * 2 * h) - h;
                }
            }

            for (int x = 0; x < DATA_SIZE - 1; x += halfSide) {
                for (int y = (x + halfSide) % sideLength; y < DATA_SIZE - 1; y += sideLength) {
                    double avg =
                            this.map[(x - halfSide + DATA_SIZE) % DATA_SIZE][y] +
                                    this.map[(x + halfSide) % DATA_SIZE][y] +
                                    this.map[x][(y + halfSide) % DATA_SIZE] +
                                    this.map[x][(y - halfSide + DATA_SIZE) % DATA_SIZE];
                    avg /= 4.0;


                    avg = avg + (r.nextDouble() * 2 * h) - h;

                    this.map[x][y] = avg;

                    if (x == 0) this.map[DATA_SIZE - 1][y] = avg;
                    if (y == 0) this.map[x][DATA_SIZE - 1] = avg;
                }
            }
        }
    }

    public void algorithm() {
        this.initializingCornerPoints();

        int lengthLine = (this.size - 1) / 2;

        Point middle = new Point(lengthLine, lengthLine);

        HashSet<Point> squareMap = this.square(middle, lengthLine);
        HashSet<Point> rhombMap = new HashSet<>();

        do {
            rhombMap.clear();
            for (Point point : squareMap) {
                rhombMap.addAll(this.rhomb(point, lengthLine));
            }

            lengthLine /= 2;
            squareMap.clear();

            for (Point point : rhombMap) {
                if (point.x >= this.size || point.x < 0 || point.y >= this.size || point.y < 0) continue;
                squareMap.addAll(this.square(point, lengthLine));
            }
        } while (lengthLine >= 1);
    }

    static DecimalFormat format = new DecimalFormat("00.00");

//    public static void main(String[] args) {
//        DiamondSquare diamondSquare = new DiamondSquare(3, 2, 0);
//
//        diamondSquare.altAlgorithm();
//        for (double[] row : diamondSquare.getDiamondSquare()) {
//            for (double y : row) {
//                System.out.print("[" + format.format(y) + "]");
//            }
//            System.out.println();
//        }
//        System.out.println("\n");
//        for (int[] row : diamondSquare.editCount) {
//            for (int y : row) {
//                System.out.print("[" + y + "]");
//            }
//            System.out.println();
//        }
//    }
}
