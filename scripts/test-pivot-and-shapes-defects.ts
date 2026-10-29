import { getToolRequiredPoints } from '../components/chart/CandlestickCanvas';
import fs from 'fs';
import path from 'path';

function runTests() {
  console.log('🧪 Starting validation of Chart Defects (Pivot Points & Shapes & Zones removal)...');

  // Test 1: PIVOT_POINTS requires 1 point
  const reqPoints = getToolRequiredPoints('PIVOT_POINTS');
  if (reqPoints !== 1) {
    throw new Error(`FAILED: Expected getToolRequiredPoints('PIVOT_POINTS') to be 1, got ${reqPoints}`);
  }
  console.log('✅ Test 1 Passed: getToolRequiredPoints("PIVOT_POINTS") === 1');

  // Test 2: Shapes & Zones group removed from DrawingToolbar.tsx
  const toolbarFile = fs.readFileSync(path.resolve('components/chart/DrawingToolbar.tsx'), 'utf8');
  if (toolbarFile.includes("id: 'shapes'") || toolbarFile.includes("title: 'Shapes & Zones'")) {
    throw new Error("FAILED: DrawingToolbar.tsx still contains 'shapes' or 'Shapes & Zones' group!");
  }
  console.log('✅ Test 2 Passed: Shapes & Zones group completely removed from DrawingToolbar.tsx');

  // Test 3: PIVOT_POINTS description updated to 1 point
  if (!toolbarFile.includes("1 point: click anchor candle to plot Pivot (P), R1-R3, S1-S3 levels")) {
    throw new Error("FAILED: PIVOT_POINTS description in DrawingToolbar.tsx was not updated to 1 point!");
  }
  console.log('✅ Test 3 Passed: PIVOT_POINTS description confirms 1 point anchor');

  // Test 4: ChartHotkeysModal does not include S/R Box / Alt+B
  const hotkeysFile = fs.readFileSync(path.resolve('components/chart/ChartHotkeysModal.tsx'), 'utf8');
  if (hotkeysFile.includes("S/R Box") || hotkeysFile.includes("['Alt', 'B']")) {
    throw new Error("FAILED: ChartHotkeysModal.tsx still contains Alt+B S/R Box!");
  }
  console.log('✅ Test 4 Passed: ChartHotkeysModal.tsx no longer exposes Alt+B S/R Box');

  // Test 5: CandlestickCanvas does not include Alt+B handler
  const canvasFile = fs.readFileSync(path.resolve('components/chart/CandlestickCanvas.tsx'), 'utf8');
  if (canvasFile.includes("onDrawingToolChange?.('RECTANGLE')")) {
    throw new Error("FAILED: CandlestickCanvas still triggers RECTANGLE on key shortcut!");
  }
  console.log('✅ Test 5 Passed: CandlestickCanvas has removed RECTANGLE shortcut');

  // Test 6: CandlestickCanvas hit test supports 1-point PIVOT_POINTS
  if (!canvasFile.includes("d.tool === 'PIVOT_POINTS' && pts.length >= 1")) {
    throw new Error("FAILED: CandlestickCanvas hit test does not support 1-point PIVOT_POINTS!");
  }
  console.log('✅ Test 6 Passed: CandlestickCanvas hit test operates on 1-point anchor');

  // Test 7: chartRenderer.ts renders 1-point PIVOT_POINTS
  const rendererFile = fs.readFileSync(path.resolve('lib/chartRenderer.ts'), 'utf8');
  if (!rendererFile.includes("item.tool === 'PIVOT_POINTS'")) {
    throw new Error("FAILED: chartRenderer.ts does not contain PIVOT_POINTS rendering!");
  }
  // Verify it is NOT under item.points.length >= 2
  const idx2pt = rendererFile.indexOf("} else if (item.points.length >= 2) {");
  const idxPivot = rendererFile.indexOf("} else if (item.tool === 'PIVOT_POINTS') {");
  if (idxPivot > idx2pt) {
    throw new Error("FAILED: PIVOT_POINTS rendering is still located under item.points.length >= 2!");
  }
  console.log('✅ Test 7 Passed: chartRenderer.ts renders PIVOT_POINTS from 1 anchor point');

  // Test 8: DrawingSettingsModal.tsx normalizes PIVOT_POINTS coordinates to 1 point
  const modalFile = fs.readFileSync(path.resolve('components/chart/DrawingSettingsModal.tsx'), 'utf8');
  if (!modalFile.includes("drawing.tool === 'PIVOT_POINTS' ? [drawing.points[0]] : drawing.points")) {
    throw new Error("FAILED: DrawingSettingsModal.tsx does not limit PIVOT_POINTS to 1 point!");
  }
  if (!modalFile.includes("drawing.tool === 'PIVOT_POINTS' ? 'Pivot Coordinates'")) {
    throw new Error("FAILED: DrawingSettingsModal.tsx does not customize Pivot Coordinates label!");
  }
  console.log('✅ Test 8 Passed: DrawingSettingsModal.tsx displays and manages single coordinate for Pivot Points');

  console.log('\n🎉 ALL 8 TESTS PASSED SUCCESSFULLY! Both active defects are completely resolved.');
}

runTests();
