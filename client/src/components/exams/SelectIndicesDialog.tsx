import React, { useState, useEffect } from "react";
import { Modal, Tree, Tag } from "antd";

export type IndexNode = {
  id: string;
  label: string;
  children?: IndexNode[];
};

interface SelectIndicesDialogProps {
  open: boolean;
  indices: IndexNode[];
  selectedIds: string[];
  onClose: () => void;
  onConfirm: (selected: string[]) => void;
}

export const SelectIndicesDialog: React.FC<SelectIndicesDialogProps> = ({
  open,
  indices,
  selectedIds,
  onClose,
  onConfirm,
}) => {
  const [checked, setChecked] = useState<string[]>(selectedIds);

  useEffect(() => {
    setChecked(selectedIds);
  }, [selectedIds, open]);

  const toTreeData = (nodes: IndexNode[]): any[] =>
    nodes.map((n) => ({
      title: n.label,
      key: n.id,
      children: n.children ? toTreeData(n.children) : undefined,
    }));

  return (
    <Modal
      title="Elegir temas/índices"
      open={open}
      onCancel={onClose}
      onOk={() => onConfirm(checked)}
      okText="Confirmar"
      cancelText="Cancelar"
      destroyOnClose
    >
      <Tree
        checkable
        selectable={false}
        treeData={toTreeData(indices)}
        checkedKeys={checked}
        defaultExpandAll
        onCheck={(keys) => setChecked(keys as string[])}
        style={{ marginBottom: 16 }}
      />
      <div>
        <strong>Seleccionados:</strong>{" "}
        {checked.length === 0
          ? <span style={{ color: "#999" }}>Ninguno</span>
          : checked.map((id) => (
              <Tag key={id} color="blue" style={{ marginBottom: 4 }}>
                {id}
              </Tag>
            ))}
      </div>
    </Modal>
  );
};