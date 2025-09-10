import React from 'react';
import { Button, Modal } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import PageTemplate from '../../components/PageTemplate';
import useInterviewFlow from '../../hooks/usInterviewFlow';
import OpenQuestion from '../../components/interview/OpenQuestion';
import TeoricQuestion from '../../components/interview/TeoricQuestion';
import MultipleQuestion from '../../components/interview/MultipleQuestion';
import { useThemeStore } from '../../store/themeStore';

const InterviewChat: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const {
    currentType,
    isModalOpen,
    next,
    finish,
    confirmFinish,
    setIsModalOpen,
  } = useInterviewFlow(['open', 'teoric', 'multiple', 'open']);

  const handleConfirm = () => {
    if (confirmFinish()) {
      navigate('/reinforcement');
    }
  };

  const renderQuestion = () => {
    switch (currentType) {
      case 'open':
        return <OpenQuestion onNext={next} />;
      case 'teoric':
        return <TeoricQuestion onNext={next} />;
      case 'multiple':
        return <MultipleQuestion onNext={next} />;
      default:
        return null;
    }
  };

  return (
    <>
      <PageTemplate
        breadcrumbs={[
          { label: 'Reforzamiento', href: '/reinforcement' },
          { label: 'Entrevista' }
        ]}
        title="Entrevista"
        actions={
          <Button
            icon={<CloseOutlined />}
            onClick={finish}
            type="primary"
            className={
              theme === 'dark'
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-primary text-white hover:bg-primary/90'
            }
          >
            Finalizar
          </Button>
        }
      >
        {renderQuestion()}
      </PageTemplate>

      <Modal
        title="Finalizar Entrevista"
        open={isModalOpen}
        onOk={handleConfirm}
        onCancel={() => setIsModalOpen(false)}
        okText="Sí, finalizar"
        cancelText="No, continuar"
      >
        <p>¿Estás seguro de que quieres finalizar la entrevista?</p>
        <p>Perderás el progreso actual.</p>
      </Modal>
    </>
  );
};

export default InterviewChat;
