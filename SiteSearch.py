import pandas as pd
import numpy as np
from scipy import stats
from scipy.signal import convolve2d
import scipy.ndimage as ndimage
import scipy.ndimage.filters as filters

def suggest_site_location(dca_file_name, dla_file_name, file_name, filter):

    dca = pd.read_csv(f'raw/coverage/{dca_file_name}',usecols=['Latitude','Longitude','RSRP (All MRs) (dBm)'])
    dla = pd.read_csv(f'raw/traffic/{dla_file_name}',usecols=['Latitude','Longitude','Total Traffic Volume (MB)'])

    dca.set_index(['Latitude','Longitude'],inplace=True)
    dla.set_index(['Latitude','Longitude'],inplace=True)

    df = dca.join(dla,how='inner')

    del dca,dla

    bins = pd.IntervalIndex.from_tuples([(-135,-125),(-125,-115),(-115,-105),(-105,-95),(-95,-85),(-85,-75),(-75,-65),(-65,-55)])
    df['suppress traffic bin'] = pd.cut(df['RSRP (All MRs) (dBm)'],bins=bins,labels=['(-135,-125)','(-125,-115)','(-115,-105)','(-105,-95)','(-95,-85)','(-85,-75)','(-75,-65)','(-65,-55)'],include_lowest=True)

    df.reset_index(inplace=True)

    traff_target = df[df['suppress traffic bin'] == bins[5]]['Total Traffic Volume (MB)'].values

    df_est_all = pd.DataFrame(data=None, columns=df.columns.tolist() + ['pct', 'est_traff'])
    for idx in range(8):

        sub_df = df[df['suppress traffic bin'] == bins[idx]]
        if idx < 5:
            traff = sub_df['Total Traffic Volume (MB)'].values
            pct_t = stats.rankdata(traff, 'min') / len(traff) * 100
            est_traff = np.percentile(traff_target, pct_t)
            sub_df['pct'] = pct_t
            sub_df['est_traff'] = est_traff
        else:
            sub_df['pct'] = 999
            sub_df['est_traff'] = sub_df['Total Traffic Volume (MB)']

        df_est_all = pd.concat([df_est_all, sub_df], axis=0)

    df_est_all['traffic_gain'] = df_est_all['est_traff'] - df_est_all['Total Traffic Volume (MB)']
    df_est_all['traffic_gain'] = df_est_all['traffic_gain'].apply(lambda x:max(0,x))

    df_est_all.reset_index(drop=True,inplace=True)

    est_traff_mat=pd.crosstab(df_est_all.Latitude,df_est_all.Longitude,values=df_est_all.traffic_gain,aggfunc=sum).fillna(0)

    filt_len = len(filter)
    filt_size = int(np.sqrt(filt_len))
    filter = np.array(filter).reshape((filt_size, filt_size)).astype(float)
    print(filter)
    # define example filter of size 8x8
    # cov_filter = np.empty((8,8),dtype=float)
    # cov_filter.fill(0.5)
    # cov_filter[1:-1,1:-1] = 0.7
    # cov_filter[2:-2,2:-2] = 0.9
    # cov_filter[3:-3,3:-3] = 1

    agg_traff = convolve2d(est_traff_mat,filter,'valid')

    '''
    ref:
    https://stackoverflow.com/questions/9111711/get-coordinates-of-local-maxima-in-2d-array-above-certain-value
    https://stackoverflow.com/questions/5298884/finding-number-of-colored-shapes-from-picture-using-python/5304140#5304140
    https://stackoverflow.com/questions/3684484/peak-detection-in-a-2d-array/3689710#3689710
    '''
    lat = est_traff_mat.index
    lon = est_traff_mat.columns

    conf_size = 8

    neighborhood_size = 2
    threshold = np.percentile(agg_traff,95)

    data = agg_traff

    data_max = filters.maximum_filter(data, neighborhood_size)
    maxima = (data == data_max)
    data_min = filters.minimum_filter(data, neighborhood_size)
    diff = ((data_max - data_min) > threshold)
    maxima[diff == 0] = 0

    labeled, num_objects = ndimage.label(maxima)
    slices = ndimage.find_objects(labeled)
    x, y = [], []
    for dy,dx in slices:
        x_center = (dx.start + dx.stop - 1)/2
        x.append(int(x_center))
        y_center = (dy.start + dy.stop - 1)/2
        y.append(int(y_center))

    # get the corresponding traffic + coordinates
    lat_res = []
    lon_res = []
    traff_res = []
    for i,j in zip(y,x):
        lat_res.append((lat[i]+lat[i+conf_size-1])/2)
        lon_res.append((lon[j]+lon[j+conf_size-1])/2)
        traff_res.append(agg_traff[i,j])

    # export the result
    pred_coord = pd.DataFrame({'lat':lat_res,'lon':lon_res,'coverage_traffic_gain':traff_res}).sort_values('coverage_traffic_gain',ascending=False)
    pred_coord.to_csv(f'src/coord/{file_name}',index=False)