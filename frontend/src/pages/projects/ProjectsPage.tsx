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
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type {
  Project,
  ProjectDetailResponse,
  ProjectVendorAdmission,
  AdmissionStatus,
} from '../../shared';
import { PROJECT_STATUSES } from '../../shared';
import { createProject, fetchProjectDetail, fetchProjects, updateProject } from '../../services/projects';

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

const projectStatusColor = (v: string) => {
  if (v === 'active') return 'green';
  if (v === 'completed') return 'blue';
  return 'default';
};

export function ProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [detail, setDetail] = useState<ProjectDetailResponse | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    try {
      setItems(await fetchProjects());
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载项目失败');
    }
  };

  const loadDetail = async (id: string) => {
    try {
      setDetail(await fetchProjectDetail(id));
      setDetailOpen(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载项目详情失败');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const vendorColumns: ColumnsType<ProjectVendorAdmission> = [
    { title: '服务商名称', dataIndex: 'vendorName' },
    { title: '统一社会信用代码', dataIndex: 'vendorCreditCode' },
    { title: '服务类别', dataIndex: 'vendorServiceType' },
    { title: '联系人', dataIndex: 'vendorContactName' },
    { title: '联系电话', dataIndex: 'vendorContactPhone' },
    {
      title: '服务商状态',
      dataIndex: 'vendorStatus',
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

  return (
    <>
      <Card
        title="项目管理"
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
            新增项目
          </Button>
        }
      >
        <Table
          rowKey="id"
          dataSource={items}
          columns={[
            { title: '项目编码', dataIndex: 'code' },
            { title: '项目名称', dataIndex: 'name' },
            { title: '区域', dataIndex: 'region' },
            { title: '负责人', dataIndex: 'managerName' },
            {
              title: '状态',
              dataIndex: 'status',
              render: (value: string) => <Tag color={projectStatusColor(value)}>{value}</Tag>,
            },
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
        <Drawer title={editing ? '编辑项目' : '新增项目'} open={open} onClose={() => setOpen(false)} width={480}>
          <Form
            layout="vertical"
            form={form}
            onFinish={async (values) => {
              try {
                if (editing) {
                  await updateProject(editing.id, values);
                  message.success('项目已更新');
                } else {
                  await createProject(values);
                  message.success('项目已创建');
                }
                setOpen(false);
                form.resetFields();
                await load();
              } catch (error) {
                message.error(error instanceof Error ? error.message : '保存项目失败');
              }
            }}
          >
            <Form.Item label="项目编码" name="code" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="项目名称" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="区域" name="region" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="负责人" name="managerName" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="状态" name="status" rules={[{ required: true }]}>
              <Select options={PROJECT_STATUSES.map((value) => ({ label: value, value }))} />
            </Form.Item>
            <Button type="primary" htmlType="submit" block>
              保存
            </Button>
          </Form>
        </Drawer>
      </Card>

      <Drawer
        title={detail ? `项目详情 - ${detail.project.name}` : '项目详情'}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={1100}
      >
        {detail && (
          <>
            <Descriptions title="基本信息" bordered size="small" column={2}>
              <Descriptions.Item label="项目编码">{detail.project.code}</Descriptions.Item>
              <Descriptions.Item label="项目名称">{detail.project.name}</Descriptions.Item>
              <Descriptions.Item label="区域">{detail.project.region}</Descriptions.Item>
              <Descriptions.Item label="负责人">{detail.project.managerName}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={projectStatusColor(detail.project.status)}>{detail.project.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建日期">{formatDate(detail.project.createdAt)}</Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions title="准入概况" size="small" column={4}>
              <Descriptions.Item label="服务商总数">{detail.vendorAdmissions.length}</Descriptions.Item>
              <Descriptions.Item label="已通过">
                {detail.vendorAdmissions.filter((v) => v.status === 'approved').length}
              </Descriptions.Item>
              <Descriptions.Item label="待审核">
                {detail.vendorAdmissions.filter((v) => v.status === 'pending').length}
              </Descriptions.Item>
              <Descriptions.Item label="已拒绝">
                {detail.vendorAdmissions.filter((v) => v.status === 'rejected').length}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Table
              rowKey="admissionId"
              size="small"
              dataSource={detail.vendorAdmissions}
              columns={vendorColumns}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1200 }}
              locale={{ emptyText: '暂无服务商准入记录' }}
            />
          </>
        )}
      </Drawer>
    </>
  );
}
