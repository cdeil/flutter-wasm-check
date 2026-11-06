import 'package:flutter/material.dart';
import 'package:syncfusion_flutter_datagrid/datagrid.dart';
import 'package:trina_grid/trina_grid.dart';

import 'data.dart';

class TrinaPage extends StatefulWidget {
  const TrinaPage({super.key, required this.rows, required this.onSelect});
  final List<SampleRow> rows;
  final ValueChanged<String> onSelect;

  @override
  State<TrinaPage> createState() => TrinaPageState();
}

class TrinaPageState extends State<TrinaPage> {
  TrinaGridStateManager? manager;

  Future<void> scroll() async {
    final grid = manager!;
    grid.scroll.vertical!.jumpTo(0);
    await grid.scroll.vertical!.animateTo(
      grid.scroll.maxScrollVertical,
      duration: const Duration(seconds: 4),
      curve: Curves.linear,
    );
  }

  @override
  Widget build(BuildContext context) => TrinaGrid(
    columns: [
      TrinaColumn(title: 'Item', field: 'name', type: TrinaColumnType.text()),
      TrinaColumn(title: 'Group', field: 'group', type: TrinaColumnType.text()),
      for (var i = 0; i < 12; i++)
        TrinaColumn(
          title: 'Month ${i + 1}',
          field: 'm$i',
          width: 115,
          type: TrinaColumnType.number(
            format: '#,##0.00',
            defaultValue: null,
            applyFormatOnInit: false,
          ),
          renderer: (cell) => Text(
            cell.cell.value == null
                ? '—'
                : (cell.cell.value as num).toStringAsFixed(2),
          ),
        ),
      TrinaColumn(
        title: 'Total',
        field: 'total',
        type: TrinaColumnType.number(
          format: '#,##0.00',
          defaultValue: null,
          applyFormatOnInit: false,
        ),
      ),
    ],
    rows: [
      for (final row in widget.rows)
        TrinaRow(
          cells: {
            'name': TrinaCell(value: row.name),
            'group': TrinaCell(value: row.group),
            for (var i = 0; i < 12; i++) 'm$i': TrinaCell(value: row.months[i]),
            'total': TrinaCell(value: row.total),
          },
        ),
    ],
    onLoaded: (event) {
      manager = event.stateManager;
      manager!.setShowColumnFilter(true);
    },
    onChanged: (event) => widget.onSelect('Edited ${event.column.title}'),
    onSelected: (event) => widget.onSelect('Selected ${event.rowIdx}'),
    onRowDoubleTap: (event) =>
        widget.onSelect('Row ${event.rowIdx} double tap'),
    configuration: TrinaGridConfiguration(
      style: Theme.of(context).brightness == Brightness.dark
          ? const TrinaGridStyleConfig.dark()
          : const TrinaGridStyleConfig(),
    ),
  );
}

class SyncGridPage extends StatefulWidget {
  const SyncGridPage({super.key, required this.rows, required this.onSelect});
  final List<SampleRow> rows;
  final ValueChanged<String> onSelect;

  @override
  State<SyncGridPage> createState() => SyncGridPageState();
}

class SyncGridPageState extends State<SyncGridPage> {
  final controller = ScrollController();
  late final source = SampleSource(widget.rows);

  Future<void> scroll() async {
    controller.jumpTo(0);
    await controller.animateTo(
      controller.position.maxScrollExtent,
      duration: const Duration(seconds: 4),
      curve: Curves.linear,
    );
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => SfDataGrid(
    source: source,
    verticalScrollController: controller,
    allowSorting: true,
    allowMultiColumnSorting: true,
    allowFiltering: true,
    allowColumnsResizing: true,
    selectionMode: SelectionMode.single,
    navigationMode: GridNavigationMode.cell,
    onCellTap: (details) => widget.onSelect(
      'Cell ${details.rowColumnIndex.rowIndex}, ${details.column.columnName}',
    ),
    columns: [
      for (final field in [
        'Item',
        'Group',
        ...List.generate(12, (i) => 'M${i + 1}'),
        'Total',
      ])
        GridColumn(
          columnName: field,
          width: field == 'Item' ? 180 : 115,
          label: Container(
            padding: const EdgeInsets.all(12),
            alignment: Alignment.centerLeft,
            child: Text(field),
          ),
        ),
    ],
  );
}

class SampleSource extends DataGridSource {
  SampleSource(List<SampleRow> input)
    : _rows = [
        for (final row in input)
          DataGridRow(
            cells: [
              DataGridCell<String>(columnName: 'Item', value: row.name),
              DataGridCell<String>(columnName: 'Group', value: row.group),
              for (var i = 0; i < 12; i++)
                DataGridCell<double>(
                  columnName: 'M${i + 1}',
                  value: row.months[i],
                ),
              DataGridCell<double>(columnName: 'Total', value: row.total),
            ],
          ),
      ];

  final List<DataGridRow> _rows;
  @override
  List<DataGridRow> get rows => _rows;

  @override
  DataGridRowAdapter buildRow(DataGridRow row) => DataGridRowAdapter(
    cells: [
      for (final cell in row.getCells())
        Container(
          alignment: cell.value is num
              ? Alignment.centerRight
              : Alignment.centerLeft,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            cell.value == null
                ? '—'
                : cell.value is double
                ? (cell.value as double).toStringAsFixed(2)
                : cell.value.toString(),
          ),
        ),
    ],
  );
}
