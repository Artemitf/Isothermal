package com.sam.iisib24.model;

import org.springframework.stereotype.Component;
import java.util.ArrayList;
import java.util.List;

@Component
public class IsothermalProcess {

    private final double R = 8.314;

    private double V1;
    private double V0;
    private double T0;
    private double m;
    private double M;

    public IsothermalProcess() {}

    public void setInitialValues(double V1, double V0, double T0, double m, double M) {
        this.V1 = V1;
        this.V0 = V0;
        this.T0 = T0;
        this.m = m;
        this.M = M;
    }

    // Вычисление давления
    public double calculatePressure(double V) {
        double V_m3 = V / 1000.0;
        return (m * R * T0) / (M * V_m3) / 1000.0;
    }

    // Генерация точек (Vi, Pi) для графика
    public List<double[]> calculateIsothermalPoints() {
        List<double[]> points = new ArrayList<>();
        for (double Vi = V0; Vi <= V1; Vi += (V1 - V0) / 50.0) {
            double Pi = calculatePressure(Vi);
            points.add(new double[]{Vi, Pi});
        }
        return points;
    }

    public double getR() {
        return R;
    }

}
