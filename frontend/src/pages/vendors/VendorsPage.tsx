import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type {
  Vendor,
  VendorDetailResponse,
  VendorProjectAdmission,
  ComplianceItem,
  PerformanceStatus,
  AdmissionStatus,
} from '../../shared';
import { VENDOR_STATUSES } from '../../shared';
import { createVendor, fetchVendorDetail, fetchVendors, updateVendor } from '../../services/vendors';

const performanceStatusMeta: Record<PerformanceStatus, { label: string; color: string }> = {
  normal: { label: '履约正常', color: 'green' },
  pending: { label: '准入待审', color: 'blue' },
  warning: { label: '履约预警', color: 'orange' },
  at_risk: { label: '履约风险', color: 'red' },
  inactive: { label: '已停用', color: 'default' },
};

const admissionStatusMeta: Record<AdmissionStatus, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'gold' },
  approved: { label: '已通过', color: 'green' },
  rejected: { label: '已拒绝', color: 'red' },
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('zh-CN');
  } catch {
    return value;
  }
};

export function VendorsPage() {
  const [items, setItems] = useState<Vendor[]>([]);
  const [open, setOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [detail, setDetail] = useState<VendorDetailResponse | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    try {
      setItems(await fetchVendors());
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载服务商失败');
    }
  };

  const loadDetail = async (id: string) => {
    try {
      setDetail(await fetchVendorDetail(id));
      setDetailOpen(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载服务商详情失败');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const admissionColumns: ColumnsType<VendorProjectAdmission> = [
    { title: '项目编码', dataIndex: 'projectCode' },
    { title: '项目名称', dataIndex: 'projectName' },
    {
      title: '项目状态',
      dataIndex: 'projectStatus',
      render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag>,
    },
    { title: '申请日期', dataIndex: 'applyDate', render: formatDate },
    { title: '计划进场日期', dataIndex: 'plannedEntryDate', render: formatDate },
    { title: '工作范围', dataIndex: 'scopeOfWork' },
    {
      title: '准入状态',
      dataIndex: 'status',
      render: (v: AdmissionStatus) => {
        const meta = admissionStatusMeta[v];
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    { title: '审核意见', dataIndex: 'reviewComment', render: (v) => v || '-' },
  ];

  const complianceColumns: ColumnsType<ComplianceItem> = [
    { title: '类型', dataIndex: 'type' },
    { title: '名称', dataIndex: 'name' },
    { title: '发证日期', dataIndex: 'issueDate', render: formatDate },
    { title: '到期日期', dataIndex: 'expiryDate', render: formatDate },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v) => <Tag color={v === 'expired' ? 'red' : 'green'}>{v === 'expired' ? '已过期' : '有效'}</Tag>,
    },
    { title: '备注', dataIndex: 'remark', render: (v) => v || '-' },
  ];

  return (
    <>
      <Card
        title="服务商管理"
        extra={
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldsValue({ status: 'active' });
              setOpen(true);
            }}
          >
            新增服务商
          </Button>
        }
      >
        <Table
          rowKey="id"
          dataSource={items}
          columns={[
            { title: '名称', dataIndex: 'name' },
            { title: '统一社会信用代码', dataIndex: 'creditCode' },
            { title: '服务类别', dataIndex: 'serviceType' },
            { title: '联系人', dataIndex: 'contactName' },
            { title: '联系电话', dataIndex: 'contactPhone' },
            {
              title: '状态',
              dataIndex: 'status',
              render: (value: string) => <Tag color={value === 'active' ? 'green' : 'default'}>{value}</Tag>,
            },
            { title: '备注', dataIndex: 'remark', render: (value: string | null) => value || '-' },
            {
              title: '操作',
              render: (_, record) => (
                <Space>
                  <Button onClick={() => void loadDetail(record.id)}>详情</Button>
                  <Button
                    onClick={() => {
                      setEditing(record);
                      form.setFieldsValue(record);
                      setOpen(true);
                    }}
                  >
                    编辑
                  </Button>
                </Space>
              ),
            },
          ]}
        />
        <Drawer
          title={editing ? '编辑服务商' : '新增服务商'}
          open={open}
          onClose={() => setOpen(false)}
          width={480}
        >
          <Typography.Paragraph type="secondary">支持新增、编辑和详情级信息展示。</Typography.Paragraph>
          <Form
            layout="vertical"
            form={form}
            onFinish={async (values) => {
              try {
                if (editing) {
                  await updateVendor(editing.id, values);
                  message.success('服务商已更新');
                } else {
                  await createVendor(values);
                  message.success('服务商已创建');
                }
                setOpen(false);
                form.resetFields();
                await load();
              } catch (error) {
                message.error(error instanceof Error ? error.message : '保存服务商失败');
              }
            }}
          >
            <Form.Item label="名称" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="统一社会信用代码" name="creditCode" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="服务类别" name="serviceType" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="联系人" name="contactName" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="联系电话" name="contactPhone" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="状态" name="status" rules={[{ required: true }]}>
              <Select options={VENDOR_STATUSES.map((value) => ({ label: value, value }))} />
            </Form.Item>
            <Form.Item label="备注" name="remark">
              <Input.TextArea rows={4} />
            </Form.Item>
            <Button type="primary" htmlType="submit" block>
              保存
            </Button>
          </Form>
        </Drawer>
      </Card>

      <Drawer
        title={detail ? `服务商详情 - ${detail.vendor.name}` : '服务商详情'}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={960}
      >
        {detail && (
          <>
            <Descriptions title="基本信息" bordered size="small" column={2}>
              <Descriptions.Item label="名称">{detail.vendor.name}</Descriptions.Item>
              <Descriptions.Item label="统一社会信用代码">{detail.vendor.creditCode}</Descriptions.Item>
              <Descriptions.Item label="服务类别">{detail.vendor.serviceType}</Descriptions.Item>
              <Descriptions.Item label="联系人">{detail.vendor.contactName}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{detail.vendor.contactPhone}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={detail.vendor.status === 'active' ? 'green' : 'default'}>{detail.vendor.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="履约状态">
                {(() => {
                  const meta = performanceStatusMeta[detail.performanceStatus];
                  return <Tag color={meta.color}>{meta.label}</Tag>;
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="创建日期">{formatDate(detail.vendor.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {detail.vendor.remark || '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Tabs
              defaultActiveKey="admissions"
              items={[
                {
                  key: 'admissions',
                  label: `项目准入 (${detail.admissions.length})`,
                  children: (
                    <Table
                      rowKey="id"
                      size="small"
                      dataSource={detail.admissions}
                      columns={admissionColumns}
                      pagination={false}
                    />
                  ),
                },
                {
                  key: 'expiring',
                  label: `即将到期 (${detail.expiringSoonComplianceItems.length})`,
                  children: (
                    <Table
                      rowKey="id"
                      size="small"
                      dataSource={detail.expiringSoonComplianceItems}
                      columns={complianceColumns}
                      pagination={false}
                      locale={{ emptyText: '暂无即将到期的资质或合同' }}
                    />
                  ),
                },
                {
                  key: 'expired',
                  label: `已过期 (${detail.expiredComplianceItems.length})`,
                  children: (
                    <Table
                      rowKey="id"
                      size="small"
                      dataSource={detail.expiredComplianceItems}
                      columns={complianceColumns}
                      pagination={false}
                      locale={{ emptyText: '暂无已过期的资质或合同' }}
                    />
                  ),
                },
              ]}
            />
          </>
        )}
      </Drawer>
    </>
  );
}
