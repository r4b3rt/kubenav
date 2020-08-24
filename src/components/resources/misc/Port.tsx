import { IonAlert, IonChip } from '@ionic/react';
import { V1PodList } from '@kubernetes/client-node';
import React, { useContext, useState, ReactElement } from 'react';

import { IContext, IPortForwardingContext } from '../../../declarations';
import { kubernetesRequest } from '../../../utils/api';
import { AppContext } from '../../../utils/context';
import { PortForwardingContext } from '../../../utils/portforwarding';

interface IPortProps {
  name: string;
  namespace: string;
  selector: string;
  port: number;
  children: ReactElement;
}

const Port: React.FunctionComponent<IPortProps> = ({ name, namespace, selector, port, children }: IPortProps) => {
  const context = useContext<IContext>(AppContext);
  const portForwardingContext = useContext<IPortForwardingContext>(PortForwardingContext);
  const [showPortLocalInput, setShowPortLocalInput] = useState<boolean>(false);

  const portForward = async (localPort: number) => {
    try {
      if (name === '') {
        const podList: V1PodList = await kubernetesRequest(
          'GET',
          `/api/v1/namespaces/${namespace}/pods?labelSelector=${selector}`,
          '',
          context.settings,
          await context.kubernetesAuthWrapper(''),
        );

        if (podList.items.length > 0 && podList.items[0].metadata) {
          await portForwardingContext.add({
            id: '',
            podName: podList.items[0].metadata.name ? podList.items[0].metadata.name : '',
            podNamespace: namespace,
            podPort: port,
            localPort: localPort,
          });
        }
      } else {
        await portForwardingContext.add({
          id: '',
          podName: name,
          podNamespace: namespace,
          podPort: port,
          localPort: localPort,
        });
      }
    } catch (err) {
      // Do nothing.
    }
  };

  return (
    <React.Fragment>
      <IonAlert
        isOpen={showPortLocalInput}
        onDidDismiss={() => setShowPortLocalInput(false)}
        header="Port"
        message="Enter the local port number"
        inputs={[
          {
            name: 'localPort',
            type: 'number',
            value: 0,
          },
        ]}
        buttons={[
          { text: 'Cancel', role: 'cancel', handler: () => setShowPortLocalInput(false) },
          { text: 'Start', handler: (data) => portForward(parseInt(data.localPort)) },
        ]}
      />

      <IonChip className="unset-chip-height" onClick={() => setShowPortLocalInput(true)}>
        {children}
      </IonChip>
    </React.Fragment>
  );
};

export default Port;
