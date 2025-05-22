package com.sam.iisib24.web.ui;

import com.sam.iisib24.model.IsothermalProcess;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.stereotype.Controller;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Controller
public class IsothermalController {

    private static final Logger log = LoggerFactory.getLogger(IsothermalController.class);
    private final IsothermalProcess process;

    public IsothermalController(IsothermalProcess process) {
        this.process = process;
    }

    @GetMapping("/isothermal")
    public String showForm() {
        log.info("GET /isothermal");
        return "isothermal";
    }

    @PostMapping("/isothermal/calculate")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> calculateIsothermal(
            @RequestParam double V1,
            @RequestParam double V0,
            @RequestParam double T0,
            @RequestParam double m,
            @RequestParam double M) {

        log.info("POST /isothermal/calculate with V1={}, V0={}, T0={}, m={}, M={}", V1, V0, T0, m, M);

        process.setInitialValues(V1, V0, T0, m, M);
        List<double[]> points = process.calculateIsothermalPoints();

        // Рассчитываем дополнительные параметры для графика
        double minVolumeM3 = Math.min(V0, V1) / 1000;
        double rawMaxP = (m * process.getR() * T0) / (M * minVolumeM3) / 1000;

        Map<String, Object> response = new HashMap<>();
        response.put("points", points);
        response.put("maxVolume", Math.ceil(Math.max(V0, V1) / 10) * 10);
        response.put("rawMaxP", rawMaxP);
        response.put("R", process.getR());

        return ResponseEntity.ok(response);
    }
}